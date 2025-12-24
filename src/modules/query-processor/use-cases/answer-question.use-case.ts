import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  EmbeddingModels,
  EmbeddingProviders,
  VectorDimensions,
} from 'src/core/embedding/clients';

import { AppConfigService } from 'src/config/app-config.service';

import { IUseCase } from 'src/common/application/contracts/i-use-case.contract';
import { Identifier } from 'src/common/domain/types/identifier';
import { TimeLogger, TimingMap } from 'src/common/helpers/time-logger.helper';

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
  AggregatedCourseSkills,
  CourseView,
  CourseWithLearningOutcomeV2Match,
} from 'src/modules/course/types/course.type';
import {
  I_FACULTY_REPOSITORY_TOKEN,
  IFacultyRepository,
} from 'src/modules/faculty/contracts/i-faculty.contract';
import { Faculty } from 'src/modules/faculty/types/faculty.type';

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
import { AnswerSynthesisPromptVersions } from '../prompts/answer-synthesis';
import { CourseRelevanceFilterPromptVersions } from '../prompts/course-relevance-filter';
import { QuestionClassificationPromptVersions } from '../prompts/question-classification';
import { SkillExpansionPromptVersions } from '../prompts/skill-expansion';
import { TClassificationCategory } from '../types/question-classification.type';
import { AnswerQuestionUseCaseInput } from './inputs/answer-question.use-case.input';
import { AnswerQuestionUseCaseOutput } from './outputs/answer-question.use-case.output';

@Injectable()
export class AnswerQuestionUseCase
  implements IUseCase<AnswerQuestionUseCaseInput, AnswerQuestionUseCaseOutput>
{
  private readonly logger = new Logger(AnswerQuestionUseCase.name);
  private readonly timeLogger = new TimeLogger();

  //อยากเรียนภาษาเพื่อใช้ในเชิงธุรกิจ ฝรั่งเศส หรือจีนก็ได

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
    private readonly appConfigService: AppConfigService,
  ) {}

  async execute(
    input: AnswerQuestionUseCaseInput,
  ): Promise<AnswerQuestionUseCaseOutput> {
    const { question, isGenEd } = input;
    // More token usage but reduces latency
    const timing = this.timeLogger.initializeTiming();

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute');
    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step1');

    const [{ category, reason }, queryProfile] = await Promise.all([
      this.questionClassifierService.classify({
        question,
        promptVersion: QuestionClassificationPromptVersions.V9,
      }),
      this.queryProfileBuilderService.buildQueryProfile(question),
    ]);

    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step1');

    this.logger.log(
      `Question classification result: ${JSON.stringify(
        { category, reason },
        null,
        2,
      )}`,
    );
    this.logger.log(
      `Query profile result: ${JSON.stringify(queryProfile, null, 2)}`,
    );

    // if (category === 'relevant') {
    //   return this.returnEmptyOutput();
    // }

    const fallbackResponse = this.getFallbackAnswerForClassification(category);

    if (fallbackResponse) {
      return fallbackResponse;
    }

    // Direct implementation copied from SkillQueryStrategy
    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step2');

    const skillExpansion = await this.skillExpanderService.expandSkillsV2(
      question,
      SkillExpansionPromptVersions.V4,
    );
    const skillItems = skillExpansion.skillItems;
    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step2');

    this.logger.log(`Expanded skills: ${JSON.stringify(skillItems, null, 2)}`);

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step3');

    const skillCoursesMap =
      await this.courseRetrieverService.getCoursesWithLosBySkillsWithFilter({
        skills: skillItems.map((item) => item.skill),
        embeddingConfiguration:
          this.appConfigService.embeddingProvider === EmbeddingProviders.E5
            ? {
                model: EmbeddingModels.E5_BASE,
                provider: EmbeddingProviders.E5,
                dimension: VectorDimensions.DIM_768,
              }
            : {
                model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
                provider: EmbeddingProviders.OPENROUTER,
                dimension: VectorDimensions.DIM_1536,
              },
        loThreshold: 0,
        topNLos: 10,
        isGenEd,
        enableLlmFilter: false,
      });

    // Add filter before aggregation
    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step4');
    const relevanceFilterResults =
      await this.courseRelevanceFilterService.batchFilterCoursesBySkill(
        question,
        queryProfile,
        skillCoursesMap,
        CourseRelevanceFilterPromptVersions.V3,
      );
    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step4');

    // Combine all relevant courses from all skills
    const filteredSkillCoursesMap = new Map<
      string,
      CourseWithLearningOutcomeV2Match[]
    >();

    for (const filterResult of relevanceFilterResults) {
      for (const [
        skill,
        courses,
      ] of filterResult.relevantCoursesBySkill.entries()) {
        if (!filteredSkillCoursesMap.has(skill)) {
          filteredSkillCoursesMap.set(skill, []);
        }
        filteredSkillCoursesMap.get(skill)!.push(...courses);
      }
    }

    // Create a map to dedupe courses by subjectCode and aggregate their skills
    const courseMap = new Map<string, AggregatedCourseSkills>();

    for (const [skill, courses] of filteredSkillCoursesMap.entries()) {
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

    // Convert the map to an array
    const aggregatedCourseSkills: AggregatedCourseSkills[] = [
      ...Array.from(courseMap.values()),
    ].sort((a, b) => b.matchedSkills.length - a.matchedSkills.length);

    if (aggregatedCourseSkills.length === 0) {
      return {
        answer: 'ขออภัย เราไม่พบรายวิชาที่เกี่ยวข้องกับคำถามของคุณ',
        suggestQuestion: 'อยากเรียนการเงินส่วนบุคคล',
        relatedCourses: [],
      };
    }

    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step3');

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step5');
    const synthesisResult = await this.answerSynthesisService.synthesizeAnswer({
      question,
      promptVersion: AnswerSynthesisPromptVersions.V6,
      queryProfile,
      aggregatedCourseSkills,
    });
    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step5');

    this.logger.log(
      `Answer synthesis result: ${JSON.stringify(synthesisResult, null, 2)}`,
    );

    const relatedCourses = await this.transformToCourseViews(
      aggregatedCourseSkills,
    );

    const result = {
      answer: synthesisResult.answerText,
      suggestQuestion: null,
      relatedCourses,
    };

    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute');
    this.logTimingResults(timing);

    return result;
  }

  private getFallbackAnswerForClassification(
    classification: TClassificationCategory,
  ): AnswerQuestionUseCaseOutput | null {
    if (classification === 'irrelevant') {
      return {
        answer: 'ขออภัย คำถามของคุณอยู่นอกขอบเขตที่เราสามารถช่วยได้',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        relatedCourses: [],
      };
    }

    if (classification === 'dangerous') {
      return {
        answer: 'ขออภัย คำถามของคุณมีเนื้อหาที่ไม่เหมาะสมหรือเป็นอันตราย',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        relatedCourses: [],
      };
    }

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
      metadata: course.metadata,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    }));
  }

  private logTimingResults(timing: TimingMap): void {
    const timingResults = {
      total: this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute?.duration,
      ),
      'step1-basic-preparation': this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute_Step1?.duration,
      ),
      'step2-skill-inference': this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute_Step2?.duration,
      ),
      'step3-retrieval': this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute_Step3?.duration,
      ),
      'step4-course-classification': this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute_Step4?.duration,
      ),
      'step5-answer-synthesis': this.timeLogger.formatDuration(
        timing.AnswerQuestionUseCaseExecute_Step5?.duration,
      ),
    };

    this.logger.log(
      `Execution timing: ${JSON.stringify(timingResults, null, 2)}`,
    );
  }
}
