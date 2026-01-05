import { Inject, Injectable, Logger } from '@nestjs/common';

import { encode } from '@toon-format/toon';
import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import { AggregatedCourseSkills } from 'src/modules/course/types/course.type';

import {
  AnswerSynthesizeInput,
  IAnswerSynthesisService,
} from '../../contracts/i-answer-synthesis-service.contract';
import { AnswerSynthesisPromptFactory } from '../../prompts/answer-synthesis';
import { AnswerSynthesisResult } from '../../types/answer-synthesis.type';
import { QueryProfile } from '../../types/query-profile.type';

@Injectable()
export class AnswerSynthesisService implements IAnswerSynthesisService {
  private readonly logger = new Logger(AnswerSynthesisService.name);

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouter: ILlmRouterService,
    private readonly modelName: string,
  ) {}

  async synthesizeAnswer(
    input: AnswerSynthesizeInput,
  ): Promise<AnswerSynthesisResult> {
    const { question, promptVersion, queryProfile, aggregatedCourseSkills } =
      input;
    const context = this.buildContext(aggregatedCourseSkills, queryProfile);

    this.logger.log(
      `[AnswerSynthesis] Synthesizing answer for question: "${question}" using model: ${this.modelName}`,
    );

    this.logger.log(
      `[AnswerSynthesis] Context data sent to prompt: ${context}`,
    );

    const { getPrompts } = AnswerSynthesisPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(promptVersion);
    const synthesisPrompt = getUserPrompt(question, context);

    const llmResult = await this.llmRouter.generateText({
      prompt: synthesisPrompt,
      systemPrompt,
      model: this.modelName,
    });

    this.logger.log(
      `[AnswerSynthesis] Generated synthesis: ${JSON.stringify(
        llmResult,
        null,
        2,
      )}`,
    );

    const tokenUsage: TokenUsage = {
      model: llmResult.model,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
    };

    const llmInfo: LlmInfo = {
      model: llmResult.model,
      provider: llmResult.provider,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
      userPrompt: synthesisPrompt,
      systemPrompt,
      promptVersion,
      schemaName: undefined,
      finishReason: llmResult.finishReason,
      warnings: llmResult.warnings,
      providerMetadata: llmResult.providerMetadata,
      response: llmResult.response,
      hyperParameters: llmResult.hyperParameters,
    };

    const synthesisResult: AnswerSynthesisResult = {
      answerText: llmResult.text,
      question,
      llmInfo,
      tokenUsage,
    };

    return synthesisResult;
  }

  private buildContext(
    aggregatedCourseSkills: AggregatedCourseSkills[],
    queryProfile: QueryProfile,
  ): string {
    const exposedDetails = aggregatedCourseSkills.map((courseSkills) => {
      return {
        subject_name: courseSkills.subjectName,
        subject_code: courseSkills.subjectCode,
        matched_skills_and_learning_outcomes: courseSkills.matchedSkills.map(
          (ms) => {
            const learningOutcomes = ms.learningOutcomes.map((lo) => ({
              learning_outcome_name: lo.cleanedName,
            }));
            return {
              skill: ms.skill,
              learning_outcomes: learningOutcomes,
            };
          },
        ),
      };
    });

    const encodedContext = encode(exposedDetails);
    const encodedQueryProfile = encode(queryProfile);
    return `Courses with skills:\n${encodedContext}\n\nUser Query Profile:\n${encodedQueryProfile}`;
  }
}
