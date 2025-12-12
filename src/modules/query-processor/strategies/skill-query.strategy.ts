import { Inject, Injectable, Logger } from '@nestjs/common';

import { TimeLogger, TimingMap } from 'src/common/helpers/time-logger.helper';

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
import { IQueryStrategy } from '../contracts/i-query-strategy.contract';
import {
  I_SKILL_EXPANDER_SERVICE_TOKEN,
  ISkillExpanderService,
} from '../contracts/i-skill-expander-service.contract';
import { CourseClassificationResult } from '../types/course-classification.type';
import { QueryProfile } from '../types/query-profile.type';
import {
  AnswerQuestionUseCaseOutput,
  CourseOutput,
} from '../use-cases/types/answer-question.use-case.type';

@Injectable()
export class SkillQueryStrategy implements IQueryStrategy {
  private readonly logger = new Logger(SkillQueryStrategy.name);
  private readonly timeLogger = new TimeLogger();

  constructor(
    @Inject(I_SKILL_EXPANDER_SERVICE_TOKEN)
    private readonly skillExpanderService: ISkillExpanderService,
    @Inject(I_COURSE_REPOSITORY_TOKEN)
    private readonly courseRepository: ICourseRepository,
    @Inject(I_COURSE_CLASSIFICATION_SERVICE_TOKEN)
    private readonly courseClassificationService: ICourseClassificationService,
    @Inject(I_ANSWER_SYNTHESIS_SERVICE_TOKEN)
    private readonly answerSynthesisService: IAnswerSynthesisService,
  ) {}

  canHandle(): boolean {
    // For now, this strategy will handle all skill-related queries
    return true;
  }

  async execute(
    question: string,
    queryProfile: QueryProfile,
    timing: TimingMap,
  ): Promise<AnswerQuestionUseCaseOutput> {
    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step2');

    const skillExpansion =
      await this.skillExpanderService.expandSkills(question);
    const skills = skillExpansion.skills;
    this.timeLogger.endTiming(timing, 'AnswerQuestionUseCaseExecute_Step2');

    this.logger.log(`Expanded skills: ${JSON.stringify(skills, null, 2)}`);

    this.timeLogger.startTiming(timing, 'AnswerQuestionUseCaseExecute_Step3');
    const skillCoursesMap =
      await this.courseRepository.findCoursesBySkillsViaLO({
        skills: skills.map((skill) => skill.skill),
        matchesPerSkill: 10, // tune this value as needed
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
  ): Promise<
    {
      skill: string;
      courses: CourseOutput[];
    }[]
  > {
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
}
