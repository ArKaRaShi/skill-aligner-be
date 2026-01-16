import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { LlmMetadataBuilder } from 'src/shared/utils/llm-metadata.builder';

import { QuestionClassifierCache } from '../../cache/question-classifier.cache';
import { QueryPipelineConfig } from '../../configs/pipeline-behavior.config';
import {
  IQuestionClassifierService,
  QuestionClassifyInput,
} from '../../contracts/i-question-classifier-service.contract';
import { QuestionClassificationPromptFactory } from '../../prompts/question-classification';
import { QuestionClassificationSchema } from '../../schemas/question-classification.schema';
import { TQuestionClassification } from '../../types/question-classification.type';

@Injectable()
export class QuestionClassifierService implements IQuestionClassifierService {
  private readonly logger = new Logger(QuestionClassifierService.name);

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouter: ILlmRouterService,
    private readonly modelName: string,
    private readonly cache: QuestionClassifierCache,
    private readonly useCache: boolean,
  ) {}

  async classify(
    input: QuestionClassifyInput,
  ): Promise<TQuestionClassification> {
    const { question, promptVersion } = input;
    if (this.useCache) {
      const cached = this.cache.lookup(question);

      if (cached) {
        this.logger.log(`Cache hit for question: "${question}"`);
        return cached;
      }
    }

    // Disabled prefiltering for now
    // const prefilterResult = this.prefilterDangerousQuestion(
    //   question,
    //   promptVersion,
    // );
    // if (prefilterResult) {
    //   if (this.useCache) {
    //     this.cache.store(question, prefilterResult);
    //   }
    //   return prefilterResult;
    // }
    const { getPrompts } = QuestionClassificationPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(promptVersion);
    const userPrompt = getUserPrompt(question);

    const result = await this.llmRouter.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema: QuestionClassificationSchema,
      model: this.modelName,
      timeout: QueryPipelineConfig.LLM_STEP_TIMEOUTS.QUESTION_CLASSIFICATION,
    });

    const { tokenUsage, llmInfo } = LlmMetadataBuilder.buildFromLlmResult(
      result,
      result.model,
      userPrompt,
      systemPrompt,
      promptVersion,
      'QuestionClassificationSchema',
    );

    const classificationResult: TQuestionClassification = {
      ...result.object,
      llmInfo,
      tokenUsage,
    };

    if (this.useCache) {
      this.cache.store(question, classificationResult);
    }

    return classificationResult;
  }
}
