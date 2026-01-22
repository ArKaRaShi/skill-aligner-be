import { Inject, Injectable, Logger } from '@nestjs/common';

import { ISseEmitter } from 'src/shared/contracts/sse/i-sse-emitter.contract';
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

import { CourseOutputDto } from '../adapters/inbound/http/dto/responses/answer-question.response.dto';
import { CourseResponseMapper } from '../adapters/inbound/http/mappers/course-response.mapper';
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
import { StepNameHelper } from '../helpers/step-name.helper';
import {
  AggregatedCourseSkills,
  CourseWithLearningOutcomeV2MatchWithRelevance,
} from '../types/course-aggregation.type';
import { CourseRelevanceFilterResultV2 } from '../types/course-relevance-filter.type';
import { TClassificationCategory } from '../types/question-classification.type';
import { SSE_EVENT_NAME, type StepSseEvent } from '../types/sse-event.type';
import { AnswerQuestionStreamUseCaseInput } from './inputs/answer-question-stream.use-case.input';
import { AnswerQuestionUseCaseOutput } from './outputs/answer-question.use-case.output';

@Injectable()
export class AnswerQuestionStreamUseCase {
  private readonly logger = new Logger(AnswerQuestionStreamUseCase.name);
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

  /**
   * Execute the query pipeline and emit progress events via the provided emitter.
   * This method allows direct control over SSE event emission for the Express response approach.
   *
   * @param input - The input parameters for the query (includes stream flag)
   * @param emitter - ISseEmitter implementation to emit SSE events
   */
  async execute(
    input: AnswerQuestionStreamUseCaseInput,
    emitter: ISseEmitter<StepSseEvent>,
  ): Promise<void> {
    const { question, isGenEd, campusId, facultyId, academicYearSemesters } =
      input;

    try {
      // Start query logging and capture processLogId for QuestionLog linking
      const processLogId = await this.queryPipelineLoggerService.start(
        question,
        {
          question,
          campusId,
          facultyId,
          isGenEd,
          academicYearSemesters,
        },
      );

      // Initialize timing and token tracking
      const timing = this.timeLogger.initializeTiming();
      const tokenMap = this.tokenLogger.initializeTokenMap();

      this.timeLogger.startTiming(timing, PIPELINE_STEPS.OVERALL.TIMING_KEY);

      // ============================================================
      // STEP 1: Question Classification
      // ============================================================
      emitter.emit(
        {
          step: 1,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'classification',
          displayName: StepNameHelper.getDisplayName('classification'),
          status: 'started',
        },
        SSE_EVENT_NAME.STEP,
      );

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

      this.timeLogger.endTiming(
        timing,
        PIPELINE_STEPS.CLASSIFICATION.TIMING_KEY,
      );

      // Log classification step
      const step1Duration =
        timing[PIPELINE_STEPS.CLASSIFICATION.TIMING_KEY]?.duration;
      await this.queryPipelineLoggerService.classification({
        question,
        promptVersion: QueryPipelinePromptConfig.CLASSIFICATION,
        classificationResult,
        duration: step1Duration,
      });

      // Create QuestionLog with classification metadata
      let questionLogId: Identifier | null = null;
      try {
        const questionLog = await this.questionLogRepository.create({
          questionText: question,
          relatedProcessLogId: processLogId,
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
        this.logger.error(
          `Failed to create QuestionLog: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      emitter.emit(
        {
          step: 1,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'classification',
          displayName: StepNameHelper.getDisplayName('classification'),
          status: 'completed',
        },
        SSE_EVENT_NAME.STEP,
      );

      // Check for fallback responses (irrelevant/dangerous questions)
      const fallbackResponse = await this.getFallbackAnswerForClassification(
        classificationResult.category,
        classificationResult.reason,
        questionLogId,
      );

      if (fallbackResponse) {
        // Fallback returns empty courses, so we emit [] as CourseOutputDto[]
        emitter.emit(
          {
            category: classificationResult.category,
            reason: classificationResult.reason,
            answer: fallbackResponse.answer,
            suggestQuestion: fallbackResponse.suggestQuestion,
            relatedCourses: [] as CourseOutputDto[],
          },
          SSE_EVENT_NAME.FALLBACK,
        );
        return;
      }

      // ============================================================
      // STEP 2: Skill Inference (Skill Expansion)
      // ============================================================
      emitter.emit(
        {
          step: 2,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'skill_expansion',
          displayName: StepNameHelper.getDisplayName('skill_expansion'),
          status: 'started',
        },
        SSE_EVENT_NAME.STEP,
      );

      this.timeLogger.startTiming(
        timing,
        PIPELINE_STEPS.SKILL_EXPANSION.TIMING_KEY,
      );

      const skillExpansion = await this.skillExpanderService.expandSkills(
        question,
        QueryPipelinePromptConfig.SKILL_EXPANSION,
      );
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

      await this.queryPipelineLoggerService.skillExpansion({
        question,
        promptVersion: QueryPipelinePromptConfig.SKILL_EXPANSION,
        skillExpansionResult: skillExpansion,
        duration: timing[PIPELINE_STEPS.SKILL_EXPANSION.TIMING_KEY]?.duration,
      });

      emitter.emit(
        {
          step: 2,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'skill_expansion',
          displayName: StepNameHelper.getDisplayName('skill_expansion'),
          status: 'completed',
        },
        SSE_EVENT_NAME.STEP,
      );

      // ============================================================
      // STEP 3: Course Retrieval
      // ============================================================
      emitter.emit(
        {
          step: 3,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'course_retrieval',
          displayName: StepNameHelper.getDisplayName('course_retrieval'),
          status: 'started',
        },
        SSE_EVENT_NAME.STEP,
      );

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

      // Add embedding tokens to token map
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

      await this.queryPipelineLoggerService.courseRetrieval({
        skills: skillItems.map((item) => item.skill),
        skillCoursesMap,
        embeddingUsage,
        duration: timing[PIPELINE_STEPS.COURSE_RETRIEVAL.TIMING_KEY]?.duration,
      });

      emitter.emit(
        {
          step: 3,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'course_retrieval',
          displayName: StepNameHelper.getDisplayName('course_retrieval'),
          status: 'completed',
        },
        SSE_EVENT_NAME.STEP,
      );

      // ============================================================
      // STEP 4: Course Relevance Filter
      // ============================================================
      emitter.emit(
        {
          step: 4,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'relevance_filter',
          displayName: StepNameHelper.getDisplayName('relevance_filter'),
          status: 'started',
        },
        SSE_EVENT_NAME.STEP,
      );

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

      if (useFilter && relevanceFilterResults) {
        await this.queryPipelineLoggerService.courseFilter({
          question,
          relevanceFilterResults,
          duration:
            timing[PIPELINE_STEPS.RELEVANCE_FILTER.TIMING_KEY]?.duration,
        });
      }

      emitter.emit(
        {
          step: 4,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'relevance_filter',
          displayName: StepNameHelper.getDisplayName('relevance_filter'),
          status: 'completed',
        },
        SSE_EVENT_NAME.STEP,
      );

      // ============================================================
      // STEP 5: Course Aggregation
      // ============================================================
      emitter.emit(
        {
          step: 5,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'aggregation',
          displayName: StepNameHelper.getDisplayName('aggregation'),
          status: 'started',
        },
        SSE_EVENT_NAME.STEP,
      );

      this.timeLogger.startTiming(
        timing,
        PIPELINE_STEPS.COURSE_AGGREGATION.TIMING_KEY,
      );

      const aggregationResult = this.courseAggregationService.aggregate({
        filteredSkillCoursesMap,
        rawSkillCoursesMap: skillCoursesMap,
      });

      const { rankedCourses } = aggregationResult;

      // Handle empty results
      if (rankedCourses.length === 0) {
        this.timeLogger.endTiming(
          timing,
          PIPELINE_STEPS.COURSE_AGGREGATION.TIMING_KEY,
        );

        await this.queryPipelineLoggerService.completeWithRawMetrics(
          {
            answer: QueryPipelineFallbackMessages.EMPTY_RESULTS,
            relatedCourses: [],
          },
          timing,
          tokenMap,
          0,
        );

        emitter.emit(
          {
            answer: QueryPipelineFallbackMessages.EMPTY_RESULTS,
            suggestQuestion:
              QueryPipelineFallbackMessages.SUGGEST_EMPTY_RESULTS,
            relatedCourses: [] as CourseOutputDto[],
            questionLogId,
          },
          SSE_EVENT_NAME.DONE,
        );
        return;
      }

      this.timeLogger.endTiming(
        timing,
        PIPELINE_STEPS.COURSE_AGGREGATION.TIMING_KEY,
      );

      await this.queryPipelineLoggerService.courseAggregation({
        filteredSkillCoursesMap,
        rankedCourses,
        duration:
          timing[PIPELINE_STEPS.COURSE_AGGREGATION.TIMING_KEY]?.duration,
      });

      emitter.emit(
        {
          step: 5,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'aggregation',
          displayName: StepNameHelper.getDisplayName('aggregation'),
          status: 'completed',
        },
        SSE_EVENT_NAME.STEP,
      );

      // Transform courses to DTOs early (needed for both streaming and non-streaming modes)
      const relatedCourses =
        await this.transformToCourseOutputDtos(rankedCourses);

      // ============================================================
      // STEP 6: Answer Synthesis
      // ============================================================
      emitter.emit(
        {
          step: 6,
          total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
          name: 'answer_synthesis',
          displayName: StepNameHelper.getDisplayName('answer_synthesis'),
          status: 'started',
        },
        SSE_EVENT_NAME.STEP,
      );

      this.timeLogger.startTiming(
        timing,
        PIPELINE_STEPS.ANSWER_SYNTHESIS.TIMING_KEY,
      );

      // Filter courses by relevance score for answer synthesis
      const relevantCourses = rankedCourses.filter(
        (course) =>
          course.maxRelevanceScore >=
          QueryPipelineConfig.ANSWER_SYNTHESIS_MIN_RELEVANCE_SCORE,
      );

      if (input.stream === false) {
        // ============================================================
        // NON-STREAM MODE: Generate complete answer, emit all at once
        // ============================================================
        const synthesisResult =
          await this.answerSynthesisService.synthesizeAnswer({
            question,
            promptVersion: QueryPipelinePromptConfig.ANSWER_SYNTHESIS,
            aggregatedCourseSkills: relevantCourses,
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

        await this.queryPipelineLoggerService.answerSynthesis({
          question,
          promptVersion: QueryPipelinePromptConfig.ANSWER_SYNTHESIS,
          synthesisResult,
          duration:
            timing[PIPELINE_STEPS.ANSWER_SYNTHESIS.TIMING_KEY]?.duration,
        });

        emitter.emit(
          {
            step: 6,
            total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
            name: 'answer_synthesis',
            displayName: StepNameHelper.getDisplayName('answer_synthesis'),
            status: 'completed',
          },
          SSE_EVENT_NAME.STEP,
        );

        this.timeLogger.endTiming(timing, PIPELINE_STEPS.OVERALL.TIMING_KEY);
        this.logExecutionMetrics(timing, tokenMap);

        // Complete query logging with metrics
        await this.queryPipelineLoggerService.completeWithRawMetrics(
          {
            answer: synthesisResult.answerText,
            suggestQuestion: undefined,
            relatedCourses: relatedCourses.map((c) => ({
              courseCode: c.subjectCode,
              courseName: c.subjectName,
            })),
          },
          timing,
          tokenMap,
          relatedCourses.length,
        );

        // Emit final result with courses (non-stream mode includes courses in DONE)
        emitter.emit(
          {
            answer: synthesisResult.answerText,
            suggestQuestion: null,
            relatedCourses,
            questionLogId,
          },
          SSE_EVENT_NAME.DONE,
        );
      } else {
        // ============================================================
        // STREAM MODE: Emit courses early, stream text chunks
        // ============================================================

        // Emit courses FIRST (frontend displays them immediately)
        emitter.emit({ courses: relatedCourses }, SSE_EVENT_NAME.COURSES);

        // Stream the answer text
        const { stream, onComplete } =
          this.answerSynthesisService.synthesizeAnswerStream({
            question,
            promptVersion: QueryPipelinePromptConfig.ANSWER_SYNTHESIS,
            aggregatedCourseSkills: relevantCourses,
          });

        let fullAnswer = '';
        for await (const { text, isFirst, isLast } of stream) {
          fullAnswer += text;
          emitter.emit(
            { chunk: text, isFirst, isLast },
            SSE_EVENT_NAME.TEXT_CHUNK,
          );
        }

        // Wait for final metadata (tokens, llmInfo)
        const { tokenUsage, llmInfo } = await onComplete;

        // Track timing and tokens
        this.tokenLogger.addTokenUsage(
          tokenMap,
          PIPELINE_STEPS.ANSWER_SYNTHESIS.TOKEN_KEY,
          tokenUsage,
        );

        this.timeLogger.endTiming(
          timing,
          PIPELINE_STEPS.ANSWER_SYNTHESIS.TIMING_KEY,
        );

        // Log answer synthesis with metadata
        await this.queryPipelineLoggerService.answerSynthesis({
          question,
          promptVersion: QueryPipelinePromptConfig.ANSWER_SYNTHESIS,
          synthesisResult: {
            answerText: fullAnswer,
            llmInfo,
          },
          duration:
            timing[PIPELINE_STEPS.ANSWER_SYNTHESIS.TIMING_KEY]?.duration,
        });

        emitter.emit(
          {
            step: 6,
            total: QueryPipelineConfig.PIPELINE_TOTAL_STEPS,
            name: 'answer_synthesis',
            displayName: StepNameHelper.getDisplayName('answer_synthesis'),
            status: 'completed',
          },
          SSE_EVENT_NAME.STEP,
        );

        this.timeLogger.endTiming(timing, PIPELINE_STEPS.OVERALL.TIMING_KEY);
        this.logExecutionMetrics(timing, tokenMap);

        // Complete query logging with metrics
        await this.queryPipelineLoggerService.completeWithRawMetrics(
          {
            answer: fullAnswer,
            suggestQuestion: undefined,
            relatedCourses: relatedCourses.map((c) => ({
              courseCode: c.subjectCode,
              courseName: c.subjectName,
            })),
          },
          timing,
          tokenMap,
          relatedCourses.length,
        );

        // Emit final DONE without courses (already sent via COURSES event)
        emitter.emit(
          {
            answer: fullAnswer,
            suggestQuestion: null,
            questionLogId,
          },
          SSE_EVENT_NAME.DONE,
        );
      }
    } catch (error) {
      await this.queryPipelineLoggerService.fail({
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      emitter.emit(
        {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        SSE_EVENT_NAME.ERROR,
      );

      // Re-throw the error for controller to handle
      throw error;
    }
  } // End of execute

  private async getFallbackAnswerForClassification(
    classification: TClassificationCategory,
    reason: string,
    questionLogId: Identifier | null,
  ): Promise<AnswerQuestionUseCaseOutput | null> {
    this.logger.debug(
      `Checking for fallback answer for classification: ${classification}, reason: ${reason}`,
    );

    if (classification === 'irrelevant') {
      await this.queryPipelineLoggerService.earlyExit({
        classification: { category: classification, reason },
      });

      return {
        answer: QueryPipelineFallbackMessages.IRRELEVANT_QUESTION,
        suggestQuestion: QueryPipelineFallbackMessages.SUGGEST_IRRELEVANT,
        relatedCourses: [],
        questionLogId,
      };
    }

    if (classification === 'dangerous') {
      await this.queryPipelineLoggerService.earlyExit({
        classification: { category: classification, reason },
      });

      return {
        answer: QueryPipelineFallbackMessages.DANGEROUS_QUESTION,
        suggestQuestion: QueryPipelineFallbackMessages.SUGGEST_DANGEROUS,
        relatedCourses: [],
        questionLogId,
      };
    }

    this.logger.debug(
      `No fallback answer for classification: ${classification}, reason: ${reason}`,
    );
    return null;
  }

  private async transformToCourseOutputDtos(
    aggregatedCourses: AggregatedCourseSkills[],
  ): Promise<CourseOutputDto[]> {
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

    // First transform to CourseView (domain type)
    const courseViews = aggregatedCourses.map((course) => ({
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

    // Then map to CourseOutputDto for SSE streaming
    return CourseResponseMapper.toCourseOutputDto(courseViews);
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
