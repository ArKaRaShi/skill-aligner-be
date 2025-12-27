import { Inject, Injectable } from '@nestjs/common';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/core/gpt-llm/contracts/i-llm-provider-client.contract';

import { LlmInfo } from 'src/common/types/llm-info.type';
import { TokenUsage } from 'src/common/types/token-usage.type';

import { CourseMatch } from 'src/modules/course/types/course.type';

import { IAnswerGeneratorService } from '../../contracts/i-answer-generator-service.contract';
import { AnswerGeneratorPromptFactory } from '../../prompts/answer-generator';
import { AnswerGeneration } from '../../types/answer-generation.type';
import { BaseAnswerGeneratorService } from './base-answer-generator.service';

@Injectable()
export class TextBasedAnswerGeneratorService
  extends BaseAnswerGeneratorService
  implements IAnswerGeneratorService
{
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

    console.log(
      'Generated context for answer generation:',
      JSON.stringify(context, null, 2),
    );

    const { getPrompts } = AnswerGeneratorPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts('v1');
    const {
      text: generatedText,
      inputTokens,
      outputTokens,
      model,
    } = await this.llmProviderClient.generateText({
      prompt: getUserPrompt(question, context),
      systemPrompt,
      model: this.modelName,
    });

    const { includes, excludes } = this.extractAndValidateAnswer(
      generatedText,
      skillCourseMatchMap,
    );

    const tokenUsage: TokenUsage = {
      model,
      inputTokens,
      outputTokens,
    };

    const llmInfo: LlmInfo = {
      model,
      userPrompt: getUserPrompt(question, context),
      systemPrompt,
      promptVersion: 'v1',
    };

    return {
      answerText: generatedText,
      includes,
      excludes,
      rawQuestion: question,
      context: context,
      llmInfo,
      tokenUsage,
    };
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
    return course.subjectName;
  }
}
