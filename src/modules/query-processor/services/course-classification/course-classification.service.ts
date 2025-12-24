import { Inject, Injectable, Logger } from '@nestjs/common';

import { encode } from '@toon-format/toon';
import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/core/gpt-llm/contracts/i-llm-provider-client.contract';

import { LearningOutcome } from 'src/modules/course/types/course-learning-outcome-v2.type';
import { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import { ICourseClassificationService } from '../../contracts/i-course-classification-service.contract';
import { CourseClassificationPromptFactory } from '../../prompts/course-classification';
import { CourseClassificationResultSchema } from '../../schemas/course-classification.schema';
import { CourseClassificationResult } from '../../types/course-classification.type';
import { QueryProfile } from '../../types/query-profile.type';

@Injectable()
export class CourseClassificationService
  implements ICourseClassificationService
{
  private readonly logger = new Logger(CourseClassificationService.name);

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
    private readonly modelName: string,
  ) {}

  async classifyCourses(
    question: string,
    queryProfile: QueryProfile,
    skillCourseMatchMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
  ): Promise<CourseClassificationResult> {
    const context = this.buildContext(skillCourseMatchMap, queryProfile);

    this.logger.log(
      `[CourseClassification] Classifying courses for question: "${question}" using model: ${this.modelName}`,
    );
    this.logger.log(
      `[CourseClassification] Context data sent to prompt: ${context}`,
    );

    const { getPrompts } = CourseClassificationPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts('v4');

    const llmResult = await this.llmProviderClient.generateObject({
      prompt: getUserPrompt(question, context),
      systemPrompt,
      schema: CourseClassificationResultSchema,
      model: this.modelName,
    });

    this.logger.log(
      `[CourseClassification] Generated classification: ${JSON.stringify(
        llmResult,
        null,
        2,
      )}`,
    );

    const classificationResult = {
      ...llmResult.object,
      question,
      context,
    };

    const sanitizedResult = this.sanitizeResult(
      classificationResult,
      skillCourseMatchMap,
    );

    this.logger.log(
      `[CourseClassification] Sanitized classification: ${JSON.stringify(
        sanitizedResult,
        null,
        2,
      )}`,
    );

    this.validateClassificationCoverage({
      classifications: sanitizedResult.classifications,
      skillCourseMatchMap,
    });

    return sanitizedResult;
  }

  private validateClassificationCoverage({
    classifications,
    skillCourseMatchMap,
  }: {
    classifications: CourseClassificationResult['classifications'];
    skillCourseMatchMap: Map<string, CourseWithLearningOutcomeV2Match[]>;
  }): void {
    const coveredCourses = new Set<string>();
    const coveredSkills = new Set<string>();

    for (const classification of classifications) {
      const normalizedSkill = this.normalizeLabel(classification.skill);
      coveredSkills.add(normalizedSkill);

      for (const course of classification.courses) {
        coveredCourses.add(this.normalizeLabel(course.name));
      }
    }

    for (const [skill, courses] of skillCourseMatchMap.entries()) {
      const normalizedSkill = this.normalizeLabel(skill);
      let skillCovered = coveredSkills.has(normalizedSkill);

      for (const course of courses) {
        const displayName = this.getCourseDisplayName(course);
        const normalizedCourse = this.normalizeLabel(displayName);
        const isCovered = coveredCourses.has(normalizedCourse);

        if (!isCovered) {
          this.logger.warn(
            `[CourseClassification] Course "${displayName}" for skill "${skill}" is missing from classifications.`,
          );
          skillCovered = false;
        }
      }

      if (!skillCovered && courses.length > 0) {
        this.logger.warn(
          `[CourseClassification] Skill "${skill}" has courses in context but is absent from classifications.`,
        );
      }
    }
  }

  private sanitizeResult(
    classificationResult: CourseClassificationResult,
    skillCourseMatchMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
  ): CourseClassificationResult {
    // populate all missing courses as excluded
    const sanitizedClassifications = classificationResult.classifications.map(
      (classification) => {
        const { skill, courses } = classification;
        const classifiedCourseMap = new Map<
          string,
          CourseClassificationResult['classifications'][number]['courses'][number]
        >();
        for (const course of courses) {
          const normalizedCourseName = this.normalizeLabel(course.name);
          classifiedCourseMap.set(normalizedCourseName, course);
        }

        const coursesInContext = skillCourseMatchMap.get(skill) ?? [];

        const sanitizedCourses = coursesInContext.map((course) => {
          const courseInContextName = this.getCourseDisplayName(course);
          const existingCourse = classifiedCourseMap.get(
            this.normalizeLabel(courseInContextName),
          );

          return (
            existingCourse ?? {
              name: courseInContextName,
              decision: 'exclude',
              reason: 'Not classified by the model',
            }
          );
        });

        return {
          ...classification,
          courses: sanitizedCourses,
        };
      },
    );

    return {
      ...classificationResult,
      classifications:
        sanitizedClassifications as CourseClassificationResult['classifications'],
    };
  }

  private buildContext(
    skillCourseMatchMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
    queryProfile: QueryProfile,
  ): string {
    const skillCoursesContext: {
      skill: string;
      courses: {
        name: string;
        learningOutcomes: string[];
      }[];
    }[] = [];
    for (const [skill, courses] of skillCourseMatchMap.entries()) {
      const courseData = courses.map((course) => {
        const courseName = this.getCourseDisplayName(course);
        const learningOutcomes = course.matchedLearningOutcomes.map((clo) =>
          this.getLoDisplayName(clo),
        );

        return {
          name: courseName,
          learningOutcomes,
        };
      });

      skillCoursesContext.push({
        skill,
        courses: courseData,
      });
    }

    const encodedContext = encode(skillCoursesContext);
    const encodedQueryProfile = encode(queryProfile);
    return `Skill groups along with courses and learning outcomes:\n${encodedContext}\n\nUser Query Profile:\n${encodedQueryProfile}`;
  }

  private normalizeLabel(label: string): string {
    return label.trim().toLowerCase();
  }

  private getCourseDisplayName(
    course: CourseWithLearningOutcomeV2Match,
  ): string {
    return course.subjectName;
  }

  private getLoDisplayName(lo: LearningOutcome): string {
    return lo.cleanedName;
  }
}
