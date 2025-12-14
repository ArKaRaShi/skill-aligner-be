import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { QuestionClassifierCache } from '../../cache/question-classifier.cache';
import {
  IQuestionClassifierService,
  QuestionClassifyInput,
} from '../../contracts/i-question-classifier-service.contract';
import {
  QuestionClassificationPromptFactory,
  QuestionClassificationPromptVersion,
} from '../../prompts/question-classification';
import { QuestionClassificationSchema } from '../../schemas/question-classification.schema';
import { TQuestionClassification } from '../../types/question-classification.type';

@Injectable()
export class QuestionClassifierService implements IQuestionClassifierService {
  private readonly logger = new Logger(QuestionClassifierService.name);

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
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

    const { object } = await this.llmProviderClient.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema: QuestionClassificationSchema,
      model: this.modelName,
    });

    const classificationResult: TQuestionClassification = {
      ...object,
      model: this.modelName,
      userPrompt,
      systemPrompt,
      promptVersion,
    };

    if (this.useCache) {
      this.cache.store(question, classificationResult);
    }

    return classificationResult;
  }
}
