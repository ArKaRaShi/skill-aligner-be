import { Injectable } from '@nestjs/common';

import { CourseMatch } from 'src/modules/course/types/course.type';
import { ILlmProviderClient } from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { IAnswerGeneratorService } from '../../contracts/i-answer-generator-service.contract';
import { AnswerGeneration } from '../../types/answer-generation.type';

export abstract class BaseAnswerGeneratorService
  implements IAnswerGeneratorService
{
  constructor(protected readonly llmProviderClient: ILlmProviderClient) {}

  abstract generateAnswer(
    question: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<AnswerGeneration>;

  /**
   * Builds the context for the answer generation based on the skill-course match map.
   * @param skillCourseMatchMap The map of skills to their corresponding courses.
   * @returns The constructed context as a string.
   */
  protected buildContext(
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
}
