import { Inject, Injectable, Logger } from '@nestjs/common';

import { CourseMatch } from 'src/modules/course/types/course.type';
import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { ICourseClassificationService } from '../../contracts/i-course-classification-service.contract';
import { CourseClassificationPromptFactory } from '../../prompts/course-classification';
import { CourseClassificationResultSchema } from '../../schemas/course-classification.schema';
import { CourseClassificationResult } from '../../types/course-classification.type';

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
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<CourseClassificationResult> {
    const context = this.buildContext(skillCourseMatchMap);

    this.logger.log(
      `[CourseClassification] Classifying courses for question: "${question}" using model: ${this.modelName}`,
    );

    const { getPrompts } = CourseClassificationPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts('v2');

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

    this.validateClassificationCoverage({
      classifications: llmResult.object.classifications,
      skillCourseMatchMap,
    });

    return classificationResult;
  }

  private validateClassificationCoverage({
    classifications,
    skillCourseMatchMap,
  }: {
    classifications: CourseClassificationResult['classifications'];
    skillCourseMatchMap: Map<string, CourseMatch[]>;
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

  private buildContext(
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): string {
    const courseIndexMap = new Map<string, number>();
    const courseMetadata = new Map<
      string,
      { course: CourseMatch; skills: Set<string> }
    >();

    const skillSummaries = Array.from(skillCourseMatchMap.entries()).map(
      ([skill, courses]) => {
        if (!courses.length) {
          return { skill, references: [] as string[] };
        }

        const references = courses.map((course) => {
          const courseId = String(course.courseId);
          if (!courseIndexMap.has(courseId)) {
            courseIndexMap.set(courseId, courseIndexMap.size + 1);
            courseMetadata.set(courseId, {
              course,
              skills: new Set(),
            });
          }

          const metadata = courseMetadata.get(courseId);
          metadata?.skills.add(skill);

          const displayName =
            course.subjectNameTh ??
            course.subjectNameEn ??
            course.subjectCode ??
            'Unknown course';

          const courseIndex = courseIndexMap.get(courseId)!;
          return `Course [${courseIndex}] (${displayName})`;
        });

        return { skill, references };
      },
    );

    const skillSummaryLines: string[] = ['Skill Summary:'];
    for (const { skill, references } of skillSummaries) {
      if (!references.length) {
        skillSummaryLines.push(`- ${skill}: No courses found.`);
        continue;
      }
      skillSummaryLines.push(`- ${skill}: ${references.join(', ')}`);
    }

    const courseDetailLines: string[] = ['\nCourse Details:'];
    const sortedCourses = Array.from(courseIndexMap.entries()).sort(
      (a, b) => a[1] - b[1],
    );

    if (!sortedCourses.length) {
      courseDetailLines.push('  No courses available.');
    }

    for (const [courseId, index] of sortedCourses) {
      const metadata = courseMetadata.get(courseId);
      if (!metadata) {
        continue;
      }
      const { course, skills } = metadata;
      const courseName =
        course.subjectNameTh ??
        course.subjectNameEn ??
        course.subjectCode ??
        `Course ${index}`;

      const supportingSkills = Array.from(skills).sort((a, b) =>
        a.localeCompare(b),
      );
      const supportingSkillsText =
        supportingSkills.length > 0
          ? supportingSkills.join(', ')
          : 'None specified';

      const learningObjectives = course.cloMatches
        .map((clo) => {
          return (
            clo.cleanedCLONameTh ??
            clo.cleanedCLONameEn ??
            clo.originalCLONameTh ??
            clo.originalCLONameEn ??
            null
          );
        })
        .filter((objective): objective is string => Boolean(objective));

      const learningObjectivesText =
        learningObjectives.length > 0
          ? learningObjectives
              .map(
                (objective, objectiveIndex) =>
                  `    ${objectiveIndex + 1}. ${objective}`,
              )
              .join('\n')
          : '    No learning objectives available.';

      courseDetailLines.push(
        [
          `Course [${index}]: ${courseName}`,
          `  Supports Skills: ${supportingSkillsText}`,
          '  Learning Objectives:',
          learningObjectivesText,
        ].join('\n'),
      );
    }

    return [skillSummaryLines.join('\n'), courseDetailLines.join('\n')].join(
      '\n\n',
    );
  }

  private normalizeLabel(label: string): string {
    return label.trim().toLowerCase();
  }

  private getCourseDisplayName(course: CourseMatch): string {
    return (
      course.subjectNameTh ??
      course.subjectNameEn ??
      course.subjectCode ??
      'Unknown course'
    );
  }
}
