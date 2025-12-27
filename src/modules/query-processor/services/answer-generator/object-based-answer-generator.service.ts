import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/core/llm/contracts/i-llm-router-service.contract';

import { LlmInfo } from 'src/common/types/llm-info.type';
import { TokenUsage } from 'src/common/types/token-usage.type';

import { CourseMatch } from 'src/modules/course/types/course.type';

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
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    llmRouter: ILlmRouterService,
    private readonly modelName: string,
  ) {
    super(llmRouter);
  }

  async generateAnswer(
    question: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<AnswerGeneration> {
    const context = this.buildContext(skillCourseMatchMap);

    const { getPrompts } = AnswerGeneratorPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts('v4');

    this.logger.log(
      `[ObjectBasedAnswerGenerator] Generating answer for question: "${question}" using model: ${this.modelName} with context: ${context}`,
    );

    const llmResult = await this.llmRouter.generateObject({
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

    const tokenUsage: TokenUsage = {
      model: this.modelName,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
    };

    const llmInfo: LlmInfo = {
      model: this.modelName,
      userPrompt: getUserPrompt(question, context),
      systemPrompt,
      promptVersion: 'v4',
    };

    return {
      ...llmAnswer,
      rawQuestion: question,
      context,
      llmInfo,
      tokenUsage,
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

  private normalizeLabel(label: string): string {
    return label.trim().toLowerCase();
  }

  private getCourseDisplayName(course: CourseMatch): string {
    return course.subjectName;
  }
}
