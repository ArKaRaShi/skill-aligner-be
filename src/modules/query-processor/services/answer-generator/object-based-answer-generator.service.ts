import { Inject, Injectable, Logger } from '@nestjs/common';

import { CourseMatch } from 'src/modules/course/types/course.type';
import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { IAnswerGeneratorService } from '../../contracts/i-answer-generator-service.contract';
import { AnswerGeneratorPromptFactory } from '../../prompts/answer-generator';
import {
  AnswerGenerationSchema,
  LlmAnswerGeneration,
} from '../../schemas/answer-generation.schema';
import { AnswerGeneration } from '../../types/answer-generation.type';
import { BaseAnswerGeneratorService } from './base-answer-generator.service';

@Injectable()
export class ObjectBasedAnswerGeneratorService
  extends BaseAnswerGeneratorService
  implements IAnswerGeneratorService
{
  private readonly logger = new Logger(ObjectBasedAnswerGeneratorService.name);

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    llmProviderClient: ILlmProviderClient,
    private readonly modelName: string,
  ) {
    super(llmProviderClient);
  }

  async generateAnswer(
    question: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<AnswerGeneration> {
    const context = this.buildContext(skillCourseMatchMap);

    const { getPrompts } = AnswerGeneratorPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts('v3');

    this.logger.log(
      `[ObjectBasedAnswerGenerator] Generating answer for question: "${question}" using model: ${this.modelName} with context: ${context}`,
    );

    const llmResult = await this.llmProviderClient.generateObject({
      prompt: getUserPrompt(question, context),
      systemPrompt,
      schema: AnswerGenerationSchema,
      model: this.modelName,
    });

    this.logger.log(
      `[ObjectBasedAnswerGenerator] Generated LLM answer: ${JSON.stringify(
        llmResult,
        null,
        2,
      )}`,
    );

    const {
      object: llmAnswer,
      includes,
      excludes,
    } = {
      object: llmResult.object,
      includes: llmResult.object.includes,
      excludes: llmResult.object.excludes,
    };

    this.validateCoverage({
      includes,
      excludes,
      skillCourseMatchMap,
    });

    return {
      ...llmAnswer,
      rawQuestion: question,
      context,
    };
  }

  private validateCoverage({
    includes,
    excludes,
    skillCourseMatchMap,
  }: {
    includes: LlmAnswerGeneration['includes'];
    excludes: LlmAnswerGeneration['excludes'];
    skillCourseMatchMap: Map<string, CourseMatch[]>;
  }): void {
    const coveredCourses = new Set<string>();
    const coveredSkills = new Set<string>();

    for (const group of [...includes, ...excludes]) {
      const normalizedSkill = this.normalizeLabel(group.skill);
      coveredSkills.add(normalizedSkill);
      for (const course of group.courses ?? []) {
        coveredCourses.add(this.normalizeLabel(course.courseName));
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
            `[ObjectBasedAnswerGenerator] Course "${displayName}" for skill "${skill}" is missing from both includes and excludes.`,
          );
          skillCovered = false;
        }
      }

      if (!skillCovered && courses.length > 0) {
        this.logger.warn(
          `[ObjectBasedAnswerGenerator] Skill "${skill}" has courses in context but is absent from both includes and excludes.`,
        );
      }
    }
  }

  private sanitizeGeneratedAnswer({
    llmAnswer,
    skillCourseMatchMap,
    question,
  }: {
    llmAnswer: LlmAnswerGeneration;
    skillCourseMatchMap: Map<string, CourseMatch[]>;
    question: string;
  }): LlmAnswerGeneration {
    const skillLookup = this.buildSkillLookup(skillCourseMatchMap);
    const forbiddenKeywords = this.extractForbiddenKeywords(question);
    const forbiddenCoursesBySkill = new Map<
      string,
      { courseName: string; reason: string }[]
    >();

    const sanitizeGroup = (
      groups: LlmAnswerGeneration['includes'],
      groupType: 'includes' | 'excludes',
    ): LlmAnswerGeneration['includes'] => {
      const originalCount = groups?.length ?? 0;
      let droppedGroups = 0;

      const sanitizedGroups = groups
        .map((group) => {
          const normalizedSkill = this.normalizeLabel(group.skill);
          const skillInfo = skillLookup.get(normalizedSkill);

          if (!skillInfo) {
            this.logger.warn(
              `[ObjectBasedAnswerGenerator] Unknown skill in ${groupType}: "${group.skill}". Skipping.`,
            );
            droppedGroups += 1;
            return null;
          }

          const uniqueCourses = new Map<
            string,
            { courseName: string; reason: string }
          >();
          let droppedCoursesForSkill = 0;

          for (const course of group.courses ?? []) {
            const normalizedCourse = this.normalizeLabel(course.courseName);
            const resolvedCourseName = skillInfo.courses.get(normalizedCourse);

            if (!resolvedCourseName) {
              this.logger.warn(
                `[ObjectBasedAnswerGenerator] Unknown course "${course.courseName}" for skill "${skillInfo.skill}" in ${groupType}. Skipping.`,
              );
              droppedCoursesForSkill += 1;
              continue;
            }

            const normalizedResolvedCourse =
              this.normalizeLabel(resolvedCourseName);
            if (groupType === 'includes') {
              const matchedKeyword = forbiddenKeywords.find((keyword) =>
                normalizedResolvedCourse.includes(keyword),
              );

              if (matchedKeyword) {
                const exclusionReason = `Excluded because the user asked to avoid "${matchedKeyword}".`;
                this.logger.warn(
                  `[ObjectBasedAnswerGenerator] Removed course "${resolvedCourseName}" for skill "${skillInfo.skill}" in ${groupType} due to user constraint "${matchedKeyword}".`,
                );
                droppedCoursesForSkill += 1;

                const existing =
                  forbiddenCoursesBySkill.get(skillInfo.skill) ?? [];
                if (
                  !existing.some(
                    ({ courseName }) => courseName === resolvedCourseName,
                  )
                ) {
                  existing.push({
                    courseName: resolvedCourseName,
                    reason: exclusionReason,
                  });
                  forbiddenCoursesBySkill.set(skillInfo.skill, existing);
                }
                continue;
              }
            }

            uniqueCourses.set(resolvedCourseName, {
              courseName: resolvedCourseName,
              reason: course.reason.trim(),
            });
          }

          if (uniqueCourses.size === 0) {
            this.logger.warn(
              `[ObjectBasedAnswerGenerator] Removed skill "${skillInfo.skill}" from ${groupType} because no valid courses remained after sanitization.`,
            );
            droppedGroups += 1;
            return null;
          }

          if (droppedCoursesForSkill > 0) {
            this.logger.warn(
              `[ObjectBasedAnswerGenerator] Removed ${droppedCoursesForSkill} invalid course(s) from skill "${skillInfo.skill}" in ${groupType} during sanitization.`,
            );
          }

          return {
            skill: skillInfo.skill,
            courses: Array.from(uniqueCourses.values()),
          };
        })
        .filter(
          (
            group,
          ): group is {
            skill: string;
            courses: { courseName: string; reason: string }[];
          } => Boolean(group),
        );

      if (originalCount > 0 && sanitizedGroups.length < originalCount) {
        this.logger.warn(
          `[ObjectBasedAnswerGenerator] Sanitization removed ${originalCount - sanitizedGroups.length} ${groupType} entr${originalCount - sanitizedGroups.length === 1 ? 'y' : 'ies'} from the LLM payload.`,
        );
      }

      return sanitizedGroups;
    };

    const sanitizedIncludes = sanitizeGroup(
      llmAnswer.includes ?? [],
      'includes',
    );
    const sanitizedExcludes = sanitizeGroup(
      llmAnswer.excludes ?? [],
      'excludes',
    );

    if (forbiddenCoursesBySkill.size > 0) {
      this.logger.warn(
        `[ObjectBasedAnswerGenerator] Adding ${forbiddenCoursesBySkill.size} entr${forbiddenCoursesBySkill.size === 1 ? 'y' : 'ies'} to excludes due to user constraints.`,
      );
      for (const [skill, courses] of forbiddenCoursesBySkill.entries()) {
        const existing = sanitizedExcludes.find(
          (entry) => entry.skill === skill,
        );
        if (existing) {
          const existingNames = new Set(
            existing.courses.map((course) => course.courseName),
          );
          for (const course of courses) {
            if (!existingNames.has(course.courseName)) {
              existing.courses.push(course);
            }
          }
        } else {
          sanitizedExcludes.push({
            skill,
            courses: [...courses],
          });
        }
      }
    }

    return {
      answerText: llmAnswer.answerText.trim(),
      includes: sanitizedIncludes,
      excludes: sanitizedExcludes,
    };
  }

  private buildSkillLookup(
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Map<string, { skill: string; courses: Map<string, string> }> {
    const lookup = new Map<
      string,
      { skill: string; courses: Map<string, string> }
    >();

    for (const [skill, courses] of skillCourseMatchMap.entries()) {
      const normalizedSkill = this.normalizeLabel(skill);
      const courseLookup = new Map<string, string>();

      for (const course of courses) {
        const displayName = this.getCourseDisplayName(course);
        courseLookup.set(this.normalizeLabel(displayName), displayName);
      }

      lookup.set(normalizedSkill, {
        skill,
        courses: courseLookup,
      });
    }

    return lookup;
  }

  private normalizeLabel(label: string): string {
    return label.trim().toLowerCase();
  }

  private extractForbiddenKeywords(question: string): string[] {
    const normalizedQuestion = this.normalizeLabel(question);
    const keywords: string[] = [];

    // Handle Thai pattern "ไม่เกี่ยวกับ <keyword>"
    const exclusionPattern = /ไม่เกี่ยวกับ\s*([^\s]+)/g;
    let match: RegExpExecArray | null;
    while ((match = exclusionPattern.exec(normalizedQuestion)) !== null) {
      const keyword = match[1].trim();
      if (keyword.length > 0) {
        keywords.push(keyword);
      }
    }

    // Additional domain-specific keywords can be appended here if needed.
    return keywords;
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
