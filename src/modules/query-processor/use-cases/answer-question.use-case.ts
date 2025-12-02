import { Inject, Injectable, Logger } from '@nestjs/common';

import { IUseCase } from 'src/common/application/contracts/i-use-case.contract';
import { TimeLogger, TimingMap } from 'src/common/helpers/time-logger';

import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from 'src/modules/course/contracts/i-course.repository';
import { CourseMatch } from 'src/modules/course/types/course.type';

import {
  I_ANSWER_SYNTHESIS_SERVICE_TOKEN,
  IAnswerSynthesisService,
} from '../contracts/i-answer-synthesis-service.contract';
import {
  I_COURSE_CLASSIFICATION_SERVICE_TOKEN,
  ICourseClassificationService,
} from '../contracts/i-course-classification-service.contract';
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
import { CourseClassificationResult } from '../types/course-classification.type';
import { Classification } from '../types/question-classification.type';
import { SkillExpansion } from '../types/skill-expansion.type';
import {
  AnswerQuestionUseCaseOutput,
  CourseOutput,
} from './types/answer-question.use-case.type';

@Injectable()
export class AnswerQuestionUseCase
  implements IUseCase<string, AnswerQuestionUseCaseOutput>
{
  private readonly logger = new Logger(AnswerQuestionUseCase.name);
  private readonly timeLogger = new TimeLogger();

  constructor(
    @Inject(I_QUESTION_CLASSIFIER_SERVICE_TOKEN)
    private readonly questionClassifierService: IQuestionClassifierService,
    @Inject(I_QUERY_PROFILE_BUILDER_SERVICE_TOKEN)
    private readonly queryProfileBuilderService: IQueryProfileBuilderService,
    @Inject(I_SKILL_EXPANDER_SERVICE_TOKEN)
    private readonly skillExpanderService: ISkillExpanderService,
    @Inject(I_COURSE_REPOSITORY_TOKEN)
    private readonly courseRepository: ICourseRepository,
    @Inject(I_COURSE_CLASSIFICATION_SERVICE_TOKEN)
    private readonly courseClassificationService: ICourseClassificationService,
    @Inject(I_ANSWER_SYNTHESIS_SERVICE_TOKEN)
    private readonly answerSynthesisService: IAnswerSynthesisService,
  ) {}

  async execute(question: string): Promise<AnswerQuestionUseCaseOutput> {
    // More token usage but reduces latency
    const timing = this.timeLogger.initializeTiming();

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute');
    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step1');

    const [{ classification, reason }, queryProfile] = await Promise.all([
      this.questionClassifierService.classify(question),
      this.queryProfileBuilderService.buildQueryProfile(question),
    ]);

    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step1');

    this.logger.log(
      `Question classification result: ${JSON.stringify(
        { classification, reason },
        null,
        2,
      )}`,
    );
    this.logger.log(
      `Query profile result: ${JSON.stringify(queryProfile, null, 2)}`,
    );

    const fallbackResponse =
      this.getFallbackAnswerForClassification(classification);

    if (fallbackResponse) {
      return fallbackResponse;
    }

    const { intents } = queryProfile;

    // Check for unknown intents first (early exit)
    const unknownIntent = intents.find(
      (intent) => intent.augmented === 'unknown',
    );
    if (unknownIntent && intents.length === 1) {
      this.logger.warn(`Unknown intent detected in question: "${question}"`);
      return {
        answer: 'ขออภัย เราไม่แน่ใจว่าคุณต้องการอะไร กรุณาลองถามใหม่อีกครั้ง',
        suggestQuestion:
          'อยากเรียนเกี่ยวกับทักษะที่จำเป็นสำหรับการทำงานในอนาคต',
        skillGroupedCourses: [],
      };
    }

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step2');
    // Hybrid Approach: Structure for future dependency management
    // Phase 1: Start independent operations in parallel
    const independentOperations: Promise<any>[] = [];

    // Check if skill expansion is needed
    const needsSkillExpansion = intents.some(
      (intent) => intent.augmented === 'ask-skills',
    );

    let skillExpansionPromise: Promise<SkillExpansion> | null = null;
    if (needsSkillExpansion) {
      skillExpansionPromise = this.skillExpanderService.expandSkills(question);
      independentOperations.push(skillExpansionPromise);
    }

    // Phase 2: Wait for independent operations to complete
    let skillExpansion: SkillExpansion | null = null;
    if (independentOperations.length > 0) {
      const results = await Promise.all(independentOperations);

      // Extract skill expansion result if it was executed
      if (skillExpansionPromise) {
        skillExpansion = results[0] as SkillExpansion;
      }
    }

    // Phase 3: Execute dependent operations (structured for future dependency management)
    const skills = skillExpansion?.skills || [];
    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step2');

    this.logger.log(`Expanded skills: ${JSON.stringify(skills, null, 2)}`);

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step3');
    const skillCoursesMap =
      await this.courseRepository.findCoursesBySkillsViaLO({
        skills: skills.map((skill) => skill.skill),
        matchesPerSkill: 5, // tune this value as needed
        // Adjust from 8.2 to 8.0 because of courses with lower relevance but still useful
        threshold: 0.8, // beware of Mar Terraform Engineer, tune this value as needed
      });

    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step3');

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step4');
    const classificationPromises: Promise<CourseClassificationResult>[] = [];
    for (const skill of skillCoursesMap.keys()) {
      const courses = skillCoursesMap.get(skill)!;
      classificationPromises.push(
        this.courseClassificationService.classifyCourses(
          question,
          queryProfile,
          new Map<string, CourseMatch[]>([[skill, courses]]),
        ),
      );
    }
    const classificationResults = await Promise.all(classificationPromises);

    // Merge classification results
    const classificationResult: CourseClassificationResult = {
      classifications: classificationResults.flatMap(
        (result) => result.classifications,
      ),
      question: classificationResults[0]?.question,
      context: classificationResults
        .map((result) => result.context)
        .join('\n\n'),
    };

    // const classificationResult =
    //   await this.courseClassificationService.classifyCourses(question, courses);
    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step4');

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step5');
    const synthesisResult = await this.answerSynthesisService.synthesizeAnswer(
      question,
      queryProfile,
      classificationResult,
    );
    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step5');

    this.logger.log(
      `Answer synthesis result: ${JSON.stringify(synthesisResult, null, 2)}`,
    );
    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute');
    this.logTimingResults(timing);

    return {
      answer: synthesisResult.answerText,
      suggestQuestion: null,
      skillGroupedCourses: await this.filterIncludedCourses(
        classificationResult,
        skillCoursesMap,
      ),
    };
  }

  private async filterIncludedCourses(
    classificationResult: CourseClassificationResult,
    skillCoursesMap: Map<string, CourseMatch[]>,
  ) {
    const skillGroupedCourses: {
      skill: string;
      courses: CourseOutput[];
    }[] = [];

    for (const classification of classificationResult.classifications) {
      const includedCourses = classification.courses.filter(
        (course) => course.decision === 'include',
      );

      // Get the original course matches for this skill
      const originalCourses = skillCoursesMap.get(classification.skill) || [];

      // Find all course matches first
      const courseMatches = includedCourses
        .map((includedCourse) => {
          const courseMatch = originalCourses.find((course) => {
            const displayName =
              course.subjectNameTh ??
              course.subjectNameEn ??
              course.subjectCode;
            return displayName === includedCourse.name;
          });

          if (!courseMatch) {
            this.logger.warn(
              `Could not find course match for "${includedCourse.name}" in skill "${classification.skill}"`,
            );
            return null;
          }

          return { courseMatch, includedCourse };
        })
        .filter(Boolean) as {
        courseMatch: CourseMatch;
        includedCourse: { name: string; reason: string };
      }[];

      // Fetch all course data in parallel
      const courseFetchPromises = courseMatches.map(
        async ({ courseMatch, includedCourse }) => {
          try {
            const fullCourseData = await this.courseRepository.findByIdOrThrow(
              courseMatch.courseId,
            );

            return {
              id: fullCourseData.courseId,
              subjectCode: fullCourseData.subjectCode,
              name:
                fullCourseData.subjectNameTh ??
                fullCourseData.subjectNameEn ??
                fullCourseData.subjectCode,
              reason: includedCourse.reason,
              learningOutcomes: fullCourseData.courseLearningOutcomes.map(
                (clo) => ({
                  id: clo.cloId,
                  name:
                    clo.cleanedCLONameTh ??
                    clo.cleanedCLONameEn ??
                    clo.originalCLONameTh ??
                    clo.originalCLONameEn,
                }),
              ),
            } as CourseOutput;
          } catch (error) {
            this.logger.warn(
              `Failed to fetch course data for course ID ${courseMatch.courseId}: ${error}`,
            );
            // Fallback to basic info if fetch fails
            return {
              id: courseMatch.courseId,
              subjectCode: courseMatch.subjectCode,
              name:
                courseMatch.subjectNameTh ??
                courseMatch.subjectNameEn ??
                courseMatch.subjectCode,
              reason: includedCourse.reason,
              learningOutcomes: [],
            } as CourseOutput;
          }
        },
      );

      const coursesWithFullData = await Promise.all(courseFetchPromises);

      skillGroupedCourses.push({
        skill: classification.skill,
        courses: coursesWithFullData,
      });
    }

    return skillGroupedCourses;
  }

  private getFallbackAnswerForClassification(
    classification: Classification,
  ): AnswerQuestionUseCaseOutput | null {
    if (classification === 'irrelevant') {
      return {
        answer: 'ขออภัย คำถามของคุณอยู่นอกขอบเขตที่เราสามารถช่วยได้',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        skillGroupedCourses: [],
      };
    }

    if (classification === 'dangerous') {
      return {
        answer: 'ขออภัย คำถามของคุณมีเนื้อหาที่ไม่เหมาะสมหรือเป็นอันตราย',
        suggestQuestion: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
        skillGroupedCourses: [],
      };
    }

    if (classification === 'unclear') {
      return {
        answer: 'ขออภัย คำถามของคุณไม่ชัดเจน กรุณาลองถามใหม่อีกครั้ง',
        suggestQuestion:
          'อยากเรียนเกี่ยวกับทักษะที่จำเป็นสำหรับการทำงานในอนาคต',
        skillGroupedCourses: [],
      };
    }

    return null;
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
