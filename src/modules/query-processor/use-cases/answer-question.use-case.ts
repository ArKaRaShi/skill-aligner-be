import { Inject, Injectable, Logger } from '@nestjs/common';

import { IUseCase } from 'src/shared/contracts/i-use-case.contract';
import { Identifier } from 'src/shared/contracts/types/identifier';
import { ArrayHelper } from 'src/shared/utils/array.helper';
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
  CourseView,
  CourseWithLearningOutcomeV2Match,
} from 'src/modules/course/types/course.type';
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

import {
  QueryPipelineDisplayKeys,
  QueryPipelinePromptConfig,
  QueryPipelineTimingSteps,
  QueryPipelineTokenCategories,
} from '../constants';
import {
  I_ANSWER_SYNTHESIS_SERVICE_TOKEN,
  IAnswerSynthesisService,
} from '../contracts/i-answer-synthesis-service.contract';
import {
  I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN,
  ICourseRelevanceFilterService,
} from '../contracts/i-course-relevance-filter-service.contract';
import {
  I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN,
  IQueryProfileBuilderService,
} from '../contracts/i-query-profile-builder-service.contract';
import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
} from '../contracts/i-question-classifier-service.contract';
import {
  I_SKILL_EXPANDER_SERVICE_TOKEN,
  ISkillExpanderService,
} from '../contracts/i-skill-expander-service.contract';
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
    @Inject(I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN)
    private readonly queryProfileBuilderService: IQueryProfileBuilderService,
    @Inject(I_SKILL_EXPANDER_SERVICE_TOKEN)
    private readonly skillExpanderService: ISkillExpanderService,
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

      this.timeLogger.startTiming(timing, QueryPipelineTimingSteps.OVERALL);
      this.timeLogger.startTiming(
        timing,
        QueryPipelineTimingSteps.STEP1_BASIC_PREPARATION,
      );

      const [classificationResult, queryProfileResult] = await Promise.all([
        this.questionClassifierService.classify({
          question,
          promptVersion: QueryPipelinePromptConfig.CLASSIFICATION,
        }),
        this.queryProfileBuilderService.buildQueryProfile(question),
      ]);

      this.tokenLogger.addTokenUsage(
        tokenMap,
        QueryPipelineTokenCategories.STEP1_BASIC_PREPARATION,
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
        QueryPipelineTimingSteps.STEP1_BASIC_PREPARATION,
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
      this.logger.log(
        `Query profile result: ${JSON.stringify(queryProfileResult, null, 2)}`,
      );

      // Log classification and query profile steps with duration
      const step1Duration =
        timing[QueryPipelineTimingSteps.STEP1_BASIC_PREPARATION]?.duration;
      await this.queryPipelineLoggerService.classification({
        question,
        promptVersion: QueryPipelinePromptConfig.CLASSIFICATION,
        classificationResult,
        duration: step1Duration,
      });

      await this.queryPipelineLoggerService.queryProfile({
        question,
        queryProfileResult,
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
      );

      if (fallbackResponse) {
        return fallbackResponse;
      }

      // Direct implementation copied from SkillQueryStrategy
      this.timeLogger.startTiming(
        timing,
        QueryPipelineTimingSteps.STEP2_SKILL_INFERENCE,
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
        QueryPipelineTokenCategories.STEP2_SKILL_INFERENCE,
        skillExpansion.tokenUsage,
      );

      this.timeLogger.endTiming(
        timing,
        QueryPipelineTimingSteps.STEP2_SKILL_INFERENCE,
      );

      this.logger.log(
        `Expanded skills: ${JSON.stringify(skillItems, null, 2)}`,
      );

      // Log skill expansion step with duration
      await this.queryPipelineLoggerService.skillExpansion({
        question,
        promptVersion: QueryPipelinePromptConfig.SKILL_EXPANSION,
        skillExpansionResult: skillExpansion,
        duration:
          timing[QueryPipelineTimingSteps.STEP2_SKILL_INFERENCE]?.duration,
      });

      this.timeLogger.startTiming(
        timing,
        QueryPipelineTimingSteps.STEP3_COURSE_RETRIEVAL,
      );

      const retrieverResult =
        await this.courseRetrieverService.getCoursesWithLosBySkillsWithFilter({
          skills: skillItems.map((item) => item.skill),
          loThreshold: 0,
          topNLos: 10,
          isGenEd,
          enableLlmFilter: false,
          campusId,
          facultyId,
          academicYearSemesters,
        });
      const { coursesBySkill: skillCoursesMap, embeddingUsage } =
        retrieverResult;
      this.timeLogger.endTiming(
        timing,
        QueryPipelineTimingSteps.STEP3_COURSE_RETRIEVAL,
      );

      // Log course retrieval step with embedding usage and duration
      await this.queryPipelineLoggerService.courseRetrieval({
        skills: skillItems.map((item) => item.skill),
        skillCoursesMap,
        embeddingUsage,
        duration:
          timing[QueryPipelineTimingSteps.STEP3_COURSE_RETRIEVAL]?.duration,
      });

      // Add filter before aggregation
      this.timeLogger.startTiming(
        timing,
        QueryPipelineTimingSteps.STEP4_COURSE_RELEVANCE_FILTER,
      );
      const filteredSkillCoursesMap = new Map<
        string,
        CourseWithLearningOutcomeV2MatchWithRelevance[]
      >();
      const useFilter = true;
      let relevanceFilterResults: CourseRelevanceFilterResultV2[] | undefined;
      if (useFilter) {
        relevanceFilterResults =
          await this.courseRelevanceFilterService.batchFilterCoursesBySkillV2(
            question,
            queryProfileResult,
            skillCoursesMap,
            QueryPipelinePromptConfig.COURSE_RELEVANCE_FILTER, // lower than v4 is binary classification
          );

        // Add tokens and build filtered map
        for (const filterResult of relevanceFilterResults) {
          this.tokenLogger.addTokenUsage(
            tokenMap,
            QueryPipelineTokenCategories.STEP4_COURSE_RELEVANCE_FILTER,
            filterResult.tokenUsage,
          );
          for (const [
            skill,
            courses,
          ] of filterResult.llmAcceptedCoursesBySkill.entries()) {
            if (!filteredSkillCoursesMap.has(skill)) {
              filteredSkillCoursesMap.set(skill, []);
            }
            filteredSkillCoursesMap.get(skill)!.push(...courses);
          }
        }
      }
      this.timeLogger.endTiming(
        timing,
        QueryPipelineTimingSteps.STEP4_COURSE_RELEVANCE_FILTER,
      );

      // Log course filter step with duration (logger handles iteration internally)
      if (useFilter && relevanceFilterResults) {
        await this.queryPipelineLoggerService.courseFilter({
          question,
          relevanceFilterResults,
          duration:
            timing[QueryPipelineTimingSteps.STEP4_COURSE_RELEVANCE_FILTER]
              ?.duration,
        });
      }

      // Step5: Course Aggregation
      this.timeLogger.startTiming(
        timing,
        QueryPipelineTimingSteps.STEP5_COURSE_AGGREGATION,
      );

      // Aggregate courses with their matched skills
      const courseMap =
        filteredSkillCoursesMap.size > 0
          ? this.aggregateCourseSkillsWithScore(filteredSkillCoursesMap)
          : this.aggregateCourseSkillsWithNoScore(skillCoursesMap);

      const aggregatedCourseSkills: AggregatedCourseSkills[] = [
        ...Array.from(courseMap.values()),
      ];

      if (aggregatedCourseSkills.length === 0) {
        // End Step5 timing before early exit
        this.timeLogger.endTiming(
          timing,
          QueryPipelineTimingSteps.STEP5_COURSE_AGGREGATION,
        );

        const emptyResult = {
          answer: 'ขออภัย เราไม่พบรายวิชาที่เกี่ยวข้องกับคำถามของคุณ',
          suggestQuestion: 'อยากเรียนการเงินส่วนบุคคล',
          relatedCourses: [],
        };

        await this.queryPipelineLoggerService.complete(
          { answer: emptyResult.answer, relatedCourses: [] },
          { counts: { coursesReturned: 0 } },
        );

        return emptyResult;
      }

      // Rank courses by score descending
      const rankedCourses = ArrayHelper.sortByNumberKeyDesc(
        aggregatedCourseSkills,
        'relevanceScore',
      );

      // End Step5: Course Aggregation (after ranking completes)
      this.timeLogger.endTiming(
        timing,
        QueryPipelineTimingSteps.STEP5_COURSE_AGGREGATION,
      );

      // Log course aggregation step with duration
      await this.queryPipelineLoggerService.courseAggregation({
        filteredSkillCoursesMap,
        rankedCourses,
        duration:
          timing[QueryPipelineTimingSteps.STEP5_COURSE_AGGREGATION]?.duration,
      });

      // Proceed with answer synthesis using ranked and retained courses
      // Step6: Answer Synthesis
      this.timeLogger.startTiming(
        timing,
        QueryPipelineTimingSteps.STEP6_ANSWER_SYNTHESIS,
      );
      const synthesisResult =
        await this.answerSynthesisService.synthesizeAnswer({
          question,
          promptVersion: QueryPipelinePromptConfig.ANSWER_SYNTHESIS,
          queryProfile: queryProfileResult,
          aggregatedCourseSkills: rankedCourses.filter(
            (course) => course.relevanceScore >= 1,
          ),
        });

      this.tokenLogger.addTokenUsage(
        tokenMap,
        QueryPipelineTokenCategories.STEP6_ANSWER_SYNTHESIS,
        synthesisResult.tokenUsage,
      );

      this.timeLogger.endTiming(
        timing,
        QueryPipelineTimingSteps.STEP6_ANSWER_SYNTHESIS,
      );

      this.logger.log(
        `Answer synthesis result: ${JSON.stringify(synthesisResult, null, 2)}`,
      );

      // Log answer synthesis step with duration
      await this.queryPipelineLoggerService.answerSynthesis({
        question,
        promptVersion: QueryPipelinePromptConfig.ANSWER_SYNTHESIS,
        synthesisResult,
        duration:
          timing[QueryPipelineTimingSteps.STEP6_ANSWER_SYNTHESIS]?.duration,
      });

      // Transform to CourseView
      const relatedCourses = await this.transformToCourseViews(rankedCourses);

      const result = {
        answer: synthesisResult.answerText,
        suggestQuestion: null,
        relatedCourses,
      };

      this.timeLogger.endTiming(timing, QueryPipelineTimingSteps.OVERALL);
      this.logExecutionMetrics(timing, tokenMap);

      // Complete query logging
      await this.queryPipelineLoggerService.complete(
        {
          answer: result.answer,
          suggestQuestion: result.suggestQuestion ?? undefined,
          relatedCourses: relatedCourses.map((c) => ({
            courseCode: c.subjectCode,
            courseName: c.subjectName,
          })),
        },
        { counts: { coursesReturned: relatedCourses.length } },
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
  ): Promise<AnswerQuestionUseCaseOutput | null> {
    this.logger.debug(
      `Checking for fallback answer for classification: ${classification}, reason: ${reason}`,
    );
    if (classification === 'irrelevant') {
      const output = {
        answer: 'ขออภัย คำถามของคุณอยู่นอกขอบเขตที่เราสามารถช่วยได้',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        relatedCourses: [],
      };

      await this.queryPipelineLoggerService.earlyExit({
        classification: { category: classification, reason },
      });

      return output;
    }

    if (classification === 'dangerous') {
      const output = {
        answer: 'ขออภัย คำถามของคุณมีเนื้อหาที่ไม่เหมาะสมหรือเป็นอันตราย',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        relatedCourses: [],
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
      score: course.relevanceScore,
      metadata: course.metadata,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }));
  }

  private logExecutionMetrics(timing: TimingMap, tokenMap: TokenMap): void {
    const timingResults = {
      [QueryPipelineDisplayKeys.TOTAL]: this.timeLogger.formatDuration(
        timing[QueryPipelineTimingSteps.OVERALL]?.duration,
      ),
      [QueryPipelineDisplayKeys.STEP1_BASIC_PREPARATION]:
        this.timeLogger.formatDuration(
          timing[QueryPipelineTimingSteps.STEP1_BASIC_PREPARATION]?.duration,
        ),
      [QueryPipelineDisplayKeys.STEP2_SKILL_INFERENCE]:
        this.timeLogger.formatDuration(
          timing[QueryPipelineTimingSteps.STEP2_SKILL_INFERENCE]?.duration,
        ),
      [QueryPipelineDisplayKeys.STEP3_COURSE_RETRIEVAL]:
        this.timeLogger.formatDuration(
          timing[QueryPipelineTimingSteps.STEP3_COURSE_RETRIEVAL]?.duration,
        ),
      [QueryPipelineDisplayKeys.STEP4_COURSE_RELEVANCE_FILTER]:
        this.timeLogger.formatDuration(
          timing[QueryPipelineTimingSteps.STEP4_COURSE_RELEVANCE_FILTER]
            ?.duration,
        ),
      [QueryPipelineDisplayKeys.STEP5_COURSE_AGGREGATION]:
        this.timeLogger.formatDuration(
          timing[QueryPipelineTimingSteps.STEP5_COURSE_AGGREGATION]?.duration,
        ),
      [QueryPipelineDisplayKeys.STEP6_ANSWER_SYNTHESIS]:
        this.timeLogger.formatDuration(
          timing[QueryPipelineTimingSteps.STEP6_ANSWER_SYNTHESIS]?.duration,
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

  private aggregateCourseSkillsWithNoScore(
    skillCoursesMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
  ): Map<string, AggregatedCourseSkills> {
    const courseMap = new Map<string, AggregatedCourseSkills>();

    for (const [skill, courses] of skillCoursesMap.entries()) {
      for (const course of courses) {
        const subjectCode = course.subjectCode;

        if (!courseMap.has(subjectCode)) {
          // Create a new AggregatedCourseSkills entry for this course
          courseMap.set(subjectCode, {
            id: course.id,
            campusId: course.campusId,
            facultyId: course.facultyId,
            subjectCode: course.subjectCode,
            subjectName: course.subjectName,
            isGenEd: course.isGenEd,
            courseLearningOutcomes: course.allLearningOutcomes,
            courseOfferings: course.courseOfferings,
            courseClickLogs: [],
            metadata: course.metadata,
            createdAt: course.createdAt,
            updatedAt: course.updatedAt,
            matchedSkills: [],
            relevanceScore: 3, // default score when no LLM filter
          });
        }

        // Add the current skill and its matched learning outcomes to the course
        const aggregatedCourse = courseMap.get(subjectCode)!;
        aggregatedCourse.matchedSkills.push({
          skill: skill,
          learningOutcomes: course.matchedLearningOutcomes,
        });
      }
    }
    return courseMap;
  }

  private aggregateCourseSkillsWithScore(
    skillCoursesMap: Map<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >,
  ): Map<string, AggregatedCourseSkills> {
    const courseMap = new Map<string, AggregatedCourseSkills>();

    for (const [skill, courses] of skillCoursesMap.entries()) {
      for (const course of courses) {
        const subjectCode = course.subjectCode;

        if (!courseMap.has(subjectCode)) {
          // Create a new AggregatedCourseSkills entry for this course
          courseMap.set(subjectCode, {
            id: course.id,
            campusId: course.campusId,
            facultyId: course.facultyId,
            subjectCode: course.subjectCode,
            subjectName: course.subjectName,
            isGenEd: course.isGenEd,
            courseLearningOutcomes: course.allLearningOutcomes,
            courseOfferings: course.courseOfferings,
            courseClickLogs: [],
            metadata: course.metadata,
            createdAt: course.createdAt,
            updatedAt: course.updatedAt,
            matchedSkills: [],
            relevanceScore: course.score,
          });
        }

        // Add the current skill and its matched learning outcomes to the course
        const aggregatedCourse = courseMap.get(subjectCode)!;
        aggregatedCourse.matchedSkills.push({
          skill: skill,
          learningOutcomes: course.matchedLearningOutcomes,
        });
        // Update the course score if the new score is higher
        if (course.score > aggregatedCourse.relevanceScore) {
          aggregatedCourse.relevanceScore = course.score;
        }
      }
    }
    return courseMap;
  }
}
