import { Inject, Injectable, Logger } from '@nestjs/common';

import { IUseCase } from 'src/shared/contracts/i-use-case.contract';
import { Identifier } from 'src/shared/contracts/types/identifier';
import { TimeLogger, TimingMap } from 'src/shared/utils/time-logger.helper';
import { TokenLogger, TokenMap } from 'src/shared/utils/token-logger.helper';

import {
  I_CAMPUS_REPOSITORY_TOKEN,
  ICampusRepository,
} from 'src/modules/campus/contracts/i-campus-repository.contract';
import { Campus } from 'src/modules/campus/types/campus.type';
import {
  I_COURSE_RETRIEVER_SERVICE_TOKEN,
  ICourseRetrieverService,
} from 'src/modules/course/contracts/i-course-retriever-service.contract';
import { CourseView } from 'src/modules/course/types/course.type';
import {
  I_FACULTY_REPOSITORY_TOKEN,
  IFacultyRepository,
} from 'src/modules/faculty/contracts/i-faculty.contract';
import { Faculty } from 'src/modules/faculty/types/faculty.type';
import { QueryPipelineLoggerService } from 'src/modules/query-logging/services/query-pipeline-logger.service';
import {
  I_QUESTION_LOG_REPOSITORY_TOKEN,
  type IQuestionLogRepository,
} from 'src/modules/question-analyses/contracts/repositories/i-question-log-repository.contract';

import { PIPELINE_STEPS } from '../configs/pipeline-steps.config';
import {
  QueryPipelineConfig,
  QueryPipelineFallbackMessages,
  QueryPipelinePromptConfig,
} from '../constants';
import {
  I_ANSWER_SYNTHESIS_SERVICE_TOKEN,
  IAnswerSynthesisService,
} from '../contracts/i-answer-synthesis-service.contract';
import {
  I_COURSE_AGGREGATION_SERVICE_TOKEN,
  ICourseAggregationService,
} from '../contracts/i-course-aggregation-service.contract';
import {
  I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN,
  ICourseRelevanceFilterService,
} from '../contracts/i-course-relevance-filter-service.contract';
import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
} from '../contracts/i-question-classifier-service.contract';
import {
  I_SKILL_EXPANDER_SERVICE_TOKEN,
  ISkillExpanderService,
} from '../contracts/i-skill-expander-service.contract';
import { CourseFilterHelper } from '../helpers/course-filter.helper';
import {
  AggregatedCourseSkills,
  CourseWithLearningOutcomeV2MatchWithRelevance,
} from '../types/course-aggregation.type';
import { CourseRelevanceFilterResultV2 } from '../types/course-relevance-filter.type';
import { TClassificationCategory } from '../types/question-classification.type';
import { AnswerQuestionUseCaseInput } from './inputs/answer-question.use-case.input';
import { AnswerQuestionUseCaseOutput } from './outputs/answer-question.use-case.output';

@Injectable()
export class AnswerQuestionUseCase
  implements IUseCase<AnswerQuestionUseCaseInput, AnswerQuestionUseCaseOutput>
{
  private readonly logger = new Logger(AnswerQuestionUseCase.name);
  private readonly timeLogger = new TimeLogger();
  private readonly tokenLogger = new TokenLogger();

  constructor(
    @Inject(I_QUESTION_CLASSIFIER_SERVICE_TOKEN)
    private readonly questionClassifierService: IQuestionClassifierService,
    @Inject(I_SKILL_EXPANDER_SERVICE_TOKEN)
    private readonly skillExpanderService: ISkillExpanderService,
    @Inject(I_COURSE_AGGREGATION_SERVICE_TOKEN)
    private readonly courseAggregationService: ICourseAggregationService,
    @Inject(I_ANSWER_SYNTHESIS_SERVICE_TOKEN)
    private readonly answerSynthesisService: IAnswerSynthesisService,
    @Inject(I_COURSE_RETRIEVER_SERVICE_TOKEN)
    private readonly courseRetrieverService: ICourseRetrieverService,
    @Inject(I_FACULTY_REPOSITORY_TOKEN)
    private readonly facultyRepository: IFacultyRepository,
    @Inject(I_CAMPUS_REPOSITORY_TOKEN)
    private readonly campusRepository: ICampusRepository,
    @Inject(I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN)
    private readonly courseRelevanceFilterService: ICourseRelevanceFilterService,
    @Inject(I_QUESTION_LOG_REPOSITORY_TOKEN)
    private readonly questionLogRepository: IQuestionLogRepository,
    private readonly queryPipelineLoggerService: QueryPipelineLoggerService,
  ) {}

  async execute(
    input: AnswerQuestionUseCaseInput,
  ): Promise<AnswerQuestionUseCaseOutput> {
    const { question, isGenEd, campusId, facultyId, academicYearSemesters } =
      input;

    // Start query logging and capture processLogId for QuestionLog linking
    const processLogId = await this.queryPipelineLoggerService.start(question, {
      question,
      campusId,
      facultyId,
      isGenEd,
      academicYearSemesters,
    });

    try {
      // More token usage but reduces latency
      const timing = this.timeLogger.initializeTiming();
      const tokenMap = this.tokenLogger.initializeTokenMap();

      this.timeLogger.startTiming(timing, PIPELINE_STEPS.OVERALL.TIMING_KEY);
      this.timeLogger.startTiming(
        timing,
        PIPELINE_STEPS.CLASSIFICATION.TIMING_KEY,
      );

      const classificationResult =
        await this.questionClassifierService.classify({
          question,
          promptVersion: QueryPipelinePromptConfig.CLASSIFICATION,
        });

      this.tokenLogger.addTokenUsage(
        tokenMap,
        PIPELINE_STEPS.CLASSIFICATION.TOKEN_KEY,
        classificationResult.tokenUsage,
      );

      this.logger.debug(
        `Question classification LLM info: ${JSON.stringify(
          classificationResult.llmInfo,
          null,
          2,
        )}`,
      );

      this.timeLogger.endTiming(
        timing,
        PIPELINE_STEPS.CLASSIFICATION.TIMING_KEY,
      );

      this.logger.log(
        `Question classification result: ${JSON.stringify(
          {
            category: classificationResult.category,
            reason: classificationResult.reason,
          },
          null,
          2,
        )}`,
      );

      // Log classification step with duration
      const step1Duration =
        timing[PIPELINE_STEPS.CLASSIFICATION.TIMING_KEY]?.duration;
      await this.queryPipelineLoggerService.classification({
        question,
        promptVersion: QueryPipelinePromptConfig.CLASSIFICATION,
        classificationResult,
        duration: step1Duration,
      });

      // Create QuestionLog with classification metadata for analytics
      // This captures ALL questions (relevant, irrelevant, dangerous) for audit trail
      // Entity extraction will only process RELEVANT questions
      let questionLogId: Identifier | null = null;
      try {
        const questionLog = await this.questionLogRepository.create({
          questionText: question,
          relatedProcessLogId: processLogId, // Link to QueryProcessLog for analysis
          metadata: {
            classification: {
              category: classificationResult.category,
              reason: classificationResult.reason,
              classifiedAt: new Date().toISOString(),
            },
            llmInfo: classificationResult.llmInfo,
            tokenUsage: classificationResult.tokenUsage,
          },
        });
        questionLogId = questionLog.id as Identifier;
        this.logger.debug(
          `QuestionLog created with ID: ${questionLogId}, linked to processLogId: ${processLogId}`,
        );
      } catch (error) {
        // Log error but don't fail the pipeline - QuestionLog is for analytics only
        this.logger.error(
          `Failed to create QuestionLog: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      // if (classificationResult.category === 'relevant') {
      //   return this.returnEmptyOutput();
      // }

      const fallbackResponse = await this.getFallbackAnswerForClassification(
        classificationResult.category,
        classificationResult.reason,
        questionLogId,
      );

      if (fallbackResponse) {
        return fallbackResponse;
      }

      // Direct implementation copied from SkillQueryStrategy
      this.timeLogger.startTiming(
        timing,
        PIPELINE_STEPS.SKILL_EXPANSION.TIMING_KEY,
      );

      this.logger.log('[DEBUG] Calling skillExpanderService.expandSkills...');
      const skillExpansion = await this.skillExpanderService.expandSkills(
        question,
        QueryPipelinePromptConfig.SKILL_EXPANSION,
      );
      this.logger.log('[DEBUG] skillExpanderService.expandSkills completed');
      const skillItems = skillExpansion.skillItems;

      this.tokenLogger.addTokenUsage(
        tokenMap,
        PIPELINE_STEPS.SKILL_EXPANSION.TOKEN_KEY,
        skillExpansion.tokenUsage,
      );

      this.timeLogger.endTiming(
        timing,
        PIPELINE_STEPS.SKILL_EXPANSION.TIMING_KEY,
      );

      this.logger.log(
        `Expanded skills: ${JSON.stringify(skillItems, null, 2)}`,
      );

      // Log skill expansion step with duration
      await this.queryPipelineLoggerService.skillExpansion({
        question,
        promptVersion: QueryPipelinePromptConfig.SKILL_EXPANSION,
        skillExpansionResult: skillExpansion,
        duration: timing[PIPELINE_STEPS.SKILL_EXPANSION.TIMING_KEY]?.duration,
      });

      this.timeLogger.startTiming(
        timing,
        PIPELINE_STEPS.COURSE_RETRIEVAL.TIMING_KEY,
      );

      const retrieverResult =
        await this.courseRetrieverService.getCoursesWithLosBySkillsWithFilter({
          skills: skillItems.map((item) => item.skill),
          loThreshold: QueryPipelineConfig.COURSE_RETRIEVAL_LO_THRESHOLD,
          topNLos: QueryPipelineConfig.COURSE_RETRIEVAL_TOP_N_LOS,
          isGenEd,
          enableLlmFilter:
            QueryPipelineConfig.COURSE_RETRIEVAL_ENABLE_LO_FILTER,
          campusId,
          facultyId,
          academicYearSemesters,
        });
      const { coursesBySkill: skillCoursesMap, embeddingUsage } =
        retrieverResult;

      // Add embedding tokens to token map for Step 3
      if (embeddingUsage && embeddingUsage.bySkill.length > 0) {
        this.tokenLogger.addTokenUsage(
          tokenMap,
          PIPELINE_STEPS.COURSE_RETRIEVAL.TOKEN_KEY,
          {
            model: embeddingUsage.bySkill[0].model,
            inputTokens: embeddingUsage.totalTokens,
            outputTokens: 0,
          },
        );
      }

      this.timeLogger.endTiming(
        timing,
        PIPELINE_STEPS.COURSE_RETRIEVAL.TIMING_KEY,
      );

      // Log course retrieval step with embedding usage and duration
      await this.queryPipelineLoggerService.courseRetrieval({
        skills: skillItems.map((item) => item.skill),
        skillCoursesMap,
        embeddingUsage,
        duration: timing[PIPELINE_STEPS.COURSE_RETRIEVAL.TIMING_KEY]?.duration,
      });

      // Add filter before aggregation
      this.timeLogger.startTiming(
        timing,
        PIPELINE_STEPS.RELEVANCE_FILTER.TIMING_KEY,
      );
      const useFilter = true;
      let relevanceFilterResults: CourseRelevanceFilterResultV2[] | undefined;
      let filteredSkillCoursesMap: Map<
        string,
        CourseWithLearningOutcomeV2MatchWithRelevance[]
      > = new Map();

      if (useFilter) {
        relevanceFilterResults =
          await this.courseRelevanceFilterService.batchFilterCoursesBySkillV2(
            question,
            skillCoursesMap,
            QueryPipelinePromptConfig.COURSE_RELEVANCE_FILTER,
          );

        // Aggregate accepted courses and track token usage via helper
        const { aggregatedMap } = CourseFilterHelper.aggregateFilteredCourses(
          relevanceFilterResults,
          tokenMap,
          PIPELINE_STEPS.RELEVANCE_FILTER.TOKEN_KEY,
          this.tokenLogger,
        );
        filteredSkillCoursesMap = aggregatedMap;
      }
      this.timeLogger.endTiming(
        timing,
        PIPELINE_STEPS.RELEVANCE_FILTER.TIMING_KEY,
      );

      // Log course filter step with duration (logger handles iteration internally)
      if (useFilter && relevanceFilterResults) {
        await this.queryPipelineLoggerService.courseFilter({
          question,
          relevanceFilterResults,
          duration:
            timing[PIPELINE_STEPS.RELEVANCE_FILTER.TIMING_KEY]?.duration,
        });
      }

      // Step5: Course Aggregation
      this.timeLogger.startTiming(
        timing,
        PIPELINE_STEPS.COURSE_AGGREGATION.TIMING_KEY,
      );

      // Aggregate courses using the course aggregation service
      const aggregationResult = this.courseAggregationService.aggregate({
        filteredSkillCoursesMap,
        rawSkillCoursesMap: skillCoursesMap,
      });

      const { rankedCourses } = aggregationResult;

      if (rankedCourses.length === 0) {
        // End Step5 timing before early exit
        this.timeLogger.endTiming(
          timing,
          PIPELINE_STEPS.COURSE_AGGREGATION.TIMING_KEY,
        );

        const emptyResult = {
          answer: QueryPipelineFallbackMessages.EMPTY_RESULTS,
          suggestQuestion: QueryPipelineFallbackMessages.SUGGEST_EMPTY_RESULTS,
          relatedCourses: [],
          questionLogId,
        };

        await this.queryPipelineLoggerService.complete(
          { answer: emptyResult.answer, relatedCourses: [] },
          { counts: { coursesReturned: 0 } },
        );

        return emptyResult;
      }

      // End Step5: Course Aggregation (after ranking completes)
      this.timeLogger.endTiming(
        timing,
        PIPELINE_STEPS.COURSE_AGGREGATION.TIMING_KEY,
      );

      // Log course aggregation step with duration
      await this.queryPipelineLoggerService.courseAggregation({
        filteredSkillCoursesMap,
        rankedCourses,
        duration:
          timing[PIPELINE_STEPS.COURSE_AGGREGATION.TIMING_KEY]?.duration,
      });

      // Proceed with answer synthesis using ranked and retained courses
      // Step6: Answer Synthesis
      this.timeLogger.startTiming(
        timing,
        PIPELINE_STEPS.ANSWER_SYNTHESIS.TIMING_KEY,
      );
      const synthesisResult =
        await this.answerSynthesisService.synthesizeAnswer({
          question,
          promptVersion: QueryPipelinePromptConfig.ANSWER_SYNTHESIS,
          aggregatedCourseSkills: rankedCourses.filter(
            (course) =>
              course.maxRelevanceScore >=
              QueryPipelineConfig.ANSWER_SYNTHESIS_MIN_RELEVANCE_SCORE,
          ),
        });

      this.tokenLogger.addTokenUsage(
        tokenMap,
        PIPELINE_STEPS.ANSWER_SYNTHESIS.TOKEN_KEY,
        synthesisResult.tokenUsage,
      );

      this.timeLogger.endTiming(
        timing,
        PIPELINE_STEPS.ANSWER_SYNTHESIS.TIMING_KEY,
      );

      this.logger.log(
        `Answer synthesis result: ${JSON.stringify(synthesisResult, null, 2)}`,
      );

      // Log answer synthesis step with duration
      await this.queryPipelineLoggerService.answerSynthesis({
        question,
        promptVersion: QueryPipelinePromptConfig.ANSWER_SYNTHESIS,
        synthesisResult,
        duration: timing[PIPELINE_STEPS.ANSWER_SYNTHESIS.TIMING_KEY]?.duration,
      });

      // Transform to CourseView
      const relatedCourses = await this.transformToCourseViews(rankedCourses);

      const result = {
        answer: synthesisResult.answerText,
        suggestQuestion: null,
        relatedCourses,
        questionLogId,
      };

      this.timeLogger.endTiming(timing, PIPELINE_STEPS.OVERALL.TIMING_KEY);
      this.logExecutionMetrics(timing, tokenMap);

      // Complete query logging with metrics
      await this.queryPipelineLoggerService.completeWithRawMetrics(
        {
          answer: result.answer,
          suggestQuestion: result.suggestQuestion ?? undefined,
          relatedCourses: relatedCourses.map((c) => ({
            subjectCode: c.subjectCode,
            subjectName: c.subjectName,
          })),
        },
        timing,
        tokenMap,
        relatedCourses.length,
      );

      return result;
    } catch (error) {
      await this.queryPipelineLoggerService.fail({
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private async getFallbackAnswerForClassification(
    classification: TClassificationCategory,
    reason: string,
    questionLogId: Identifier | null,
  ): Promise<AnswerQuestionUseCaseOutput | null> {
    this.logger.debug(
      `Checking for fallback answer for classification: ${classification}, reason: ${reason}`,
    );
    if (classification === 'irrelevant') {
      const output = {
        answer: QueryPipelineFallbackMessages.IRRELEVANT_QUESTION,
        suggestQuestion: QueryPipelineFallbackMessages.SUGGEST_IRRELEVANT,
        relatedCourses: [],
        questionLogId,
      };

      await this.queryPipelineLoggerService.earlyExit({
        classification: { category: classification, reason },
      });

      return output;
    }

    if (classification === 'dangerous') {
      const output = {
        answer: QueryPipelineFallbackMessages.DANGEROUS_QUESTION,
        suggestQuestion: QueryPipelineFallbackMessages.SUGGEST_DANGEROUS,
        relatedCourses: [],
        questionLogId,
      };

      await this.queryPipelineLoggerService.earlyExit({
        classification: { category: classification, reason },
      });

      return output;
    }

    this.logger.debug(
      `No fallback answer for classification: ${classification}, reason: ${reason}`,
    );
    return null;
  }

  private async transformToCourseViews(
    aggregatedCourses: AggregatedCourseSkills[],
  ): Promise<CourseView[]> {
    const [faculties, campuses] = await Promise.all([
      this.facultyRepository.findMany(),
      this.campusRepository.findMany({ includeFaculties: false }),
    ]);
    const facultyMap = new Map<Identifier, Faculty>();
    for (const faculty of faculties) {
      facultyMap.set(faculty.facultyId, faculty);
    }
    const campusMap = new Map<Identifier, Campus>();
    for (const campus of campuses) {
      campusMap.set(campus.campusId, campus);
    }

    return aggregatedCourses.map((course) => ({
      id: course.id,
      campus: campusMap.get(course.campusId)!,
      faculty: facultyMap.get(course.facultyId)!,
      subjectCode: course.subjectCode,
      subjectName: course.subjectName,
      isGenEd: course.isGenEd,
      courseLearningOutcomes: course.courseLearningOutcomes,
      courseOfferings: course.courseOfferings,
      matchedSkills: course.matchedSkills,
      totalClicks: course.courseClickLogs.length,
      score: course.maxRelevanceScore,
      metadata: course.metadata,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }));
  }

  private logExecutionMetrics(timing: TimingMap, tokenMap: TokenMap): void {
    const timingResults = {
      [PIPELINE_STEPS.OVERALL.DISPLAY_KEY]: this.timeLogger.formatDuration(
        timing[PIPELINE_STEPS.OVERALL.TIMING_KEY]?.duration,
      ),
      [PIPELINE_STEPS.CLASSIFICATION.DISPLAY_KEY]:
        this.timeLogger.formatDuration(
          timing[PIPELINE_STEPS.CLASSIFICATION.TIMING_KEY]?.duration,
        ),
      [PIPELINE_STEPS.SKILL_EXPANSION.DISPLAY_KEY]:
        this.timeLogger.formatDuration(
          timing[PIPELINE_STEPS.SKILL_EXPANSION.TIMING_KEY]?.duration,
        ),
      [PIPELINE_STEPS.COURSE_RETRIEVAL.DISPLAY_KEY]:
        this.timeLogger.formatDuration(
          timing[PIPELINE_STEPS.COURSE_RETRIEVAL.TIMING_KEY]?.duration,
        ),
      [PIPELINE_STEPS.RELEVANCE_FILTER.DISPLAY_KEY]:
        this.timeLogger.formatDuration(
          timing[PIPELINE_STEPS.RELEVANCE_FILTER.TIMING_KEY]?.duration,
        ),
      [PIPELINE_STEPS.COURSE_AGGREGATION.DISPLAY_KEY]:
        this.timeLogger.formatDuration(
          timing[PIPELINE_STEPS.COURSE_AGGREGATION.TIMING_KEY]?.duration,
        ),
      [PIPELINE_STEPS.ANSWER_SYNTHESIS.DISPLAY_KEY]:
        this.timeLogger.formatDuration(
          timing[PIPELINE_STEPS.ANSWER_SYNTHESIS.TIMING_KEY]?.duration,
        ),
    };

    const tokenSummary = this.tokenLogger.getSummary(tokenMap);

    const tokenResults: Record<string, any> = {
      total: {
        inputTokens: tokenSummary.totalTokens?.inputTokens,
        outputTokens: tokenSummary.totalTokens?.outputTokens,
        cost: this.tokenLogger.formatCost(tokenSummary.totalCost ?? 0),
      },
    };

    // Add per-step breakdown
    for (const [step, data] of Object.entries(tokenSummary.byCategory)) {
      tokenResults[step] = {
        inputTokens: data.tokenCount.inputTokens,
        outputTokens: data.tokenCount.outputTokens,
        cost: this.tokenLogger.formatCost(data.cost),
        recordCount: data.recordCount,
      };
    }

    const combinedResults = {
      executionTiming: timingResults,
      tokenUsage: tokenResults,
    };

    this.logger.log(
      `Execution metrics: ${JSON.stringify(combinedResults, null, 2)}`,
    );
  }
}
