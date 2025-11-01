import { Inject, Injectable } from '@nestjs/common';

import { CourseMatch } from 'src/modules/course/types/course.type';
import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { IAnswerGeneratorService } from '../../contracts/i-answer-generator-service.contract';
import { AnswerGeneratorPromptFactory } from '../../prompts/answer-generator';
import { AnswerGeneration } from '../../types/answer-generation.type';

@Injectable()
export class AnswerGeneratorService implements IAnswerGeneratorService {
  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
  ) {}

  async generateAnswer(
    question: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<AnswerGeneration> {
    const context = this.buildContext(skillCourseMatchMap);

    console.log(
      'Generated context for answer generation:',
      JSON.stringify(context, null, 2),
    );

    const { getPrompts } = AnswerGeneratorPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts('v1');
    const text = await this.llmProviderClient.generateText({
      prompt: getUserPrompt(question, context),
      systemPrompt,
    });

    const { includes, excludes } = this.extractAndValidateAnswer(
      text,
      skillCourseMatchMap,
    );

    return {
      answerText: text,
      includes,
      excludes,
      rawQuestion: question,
      context: context,
    };
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

  private extractAndValidateAnswer(
    answer: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Pick<AnswerGeneration, 'includes' | 'excludes'> {
    const normalizedAnswer = answer.toLowerCase();
    const includesMap = new Map<
      string,
      { skill: string; courses: Map<string, string> }
    >();

    const allowedCourseNames = new Map<string, string>(); // normalized -> original display name
    const allowedSkillNames = new Map<string, string>();

    for (const [skill, courses] of skillCourseMatchMap.entries()) {
      const skillKey = skill.toLowerCase();
      allowedSkillNames.set(skillKey, skill);

      let referencedSkill = false;
      if (this.containsPhrase(normalizedAnswer, skillKey)) {
        referencedSkill = true;
        includesMap.set(skillKey, {
          skill,
          courses: new Map(),
        });
      }

      for (const course of courses) {
        const courseDisplayName = this.getCourseDisplayName(course);
        const courseKey = courseDisplayName.toLowerCase();
        allowedCourseNames.set(courseKey, courseDisplayName);

        if (this.containsPhrase(normalizedAnswer, courseKey)) {
          if (!includesMap.has(skillKey)) {
            includesMap.set(skillKey, {
              skill,
              courses: new Map(),
            });
          }
          includesMap
            .get(skillKey)!
            .courses.set(courseDisplayName, 'Referenced in generated answer.');
          referencedSkill = true;
        }
      }

      if (!referencedSkill && includesMap.has(skillKey)) {
        // ensure the entry exists even if no course matched explicitly
        includesMap.get(skillKey)!.courses = includesMap.get(skillKey)!.courses;
      }
    }

    this.validateHighlightedSegments(
      answer,
      allowedSkillNames,
      allowedCourseNames,
    );

    const includes = Array.from(includesMap.values())
      .filter(({ courses }) => courses.size > 0)
      .map(({ skill, courses }) => ({
        skill,
        courses: Array.from(courses.entries()).map(([courseName, reason]) => ({
          courseName,
          reason,
        })),
      }));

    return {
      includes,
      excludes: [],
    };
  }

  private containsPhrase(text: string, phrase: string): boolean {
    if (!phrase || phrase.trim().length === 0) {
      return false;
    }

    return text.includes(phrase.trim());
  }

  private validateHighlightedSegments(
    answer: string,
    allowedSkillNames: Map<string, string>,
    allowedCourseNames: Map<string, string>,
  ): void {
    const matches = Array.from(answer.matchAll(/\*\*(.+?)\*\*/g));
    for (const match of matches) {
      const rawSegment = match[1].trim();
      if (!rawSegment) {
        continue;
      }

      const segmentLower = rawSegment.toLowerCase();
      if (segmentLower.startsWith('course [')) {
        continue;
      }

      const isKnownSkill = Array.from(allowedSkillNames.values()).some(
        (skill) => segmentLower.includes(skill.toLowerCase()),
      );
      const isKnownCourse = Array.from(allowedCourseNames.values()).some(
        (course) => segmentLower.includes(course.toLowerCase()),
      );

      if (!isKnownSkill && !isKnownCourse) {
        console.warn(
          `Answer referenced an unknown segment: "${rawSegment}". Skipping validation error but please review.`,
        );
      }
    }
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
