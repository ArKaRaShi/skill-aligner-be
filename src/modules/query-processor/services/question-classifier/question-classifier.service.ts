import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { QuestionClassifierCache } from '../../cache/question-classifier.cache';
import { IQuestionClassifierService } from '../../contracts/i-question-classifier-service.contract';
import { QuestionClassificationPromptFactory } from '../../prompts/question-classification';
import { QuestionClassificationSchema } from '../../schemas/question-classification.schema';
import { QuestionClassification } from '../../types/question-classification.type';

@Injectable()
export class QuestionClassifierService implements IQuestionClassifierService {
  private readonly dangerousConcepts = [
    // Violence / crime
    'kill someone',
    'harm',
    'robbery',
    'explosives',
    'assault',
    'คุกคาม',
    'ทำร้าย',
    'ลอบสังหาร',
    'ก่อการร้าย',

    // Sexual / NSFW
    'โป๊',
    'nude',
    'porn',
    'sex',
    'sexual',
    'erotic',
    'xxx',
    'masturbate',
    'ลามก',
    'อนาจาร',
    'เย็ด',
    'xxx video',

    // Drugs / illegal
    'ค้ายาเสพติด',
    'drug',
    'cocaine',
    'heroin',
    'meth',
  ];
  private readonly logger = new Logger(QuestionClassifierService.name);
  private readonly promptVersion = 'v2';

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
    private readonly modelName: string,
    private readonly cache: QuestionClassifierCache,
    private readonly useCache: boolean,
  ) {}

  async classify(question: string): Promise<QuestionClassification> {
    if (this.useCache) {
      const cached = this.cache.lookup(question);

      if (cached) {
        this.logger.log(`Cache hit for question: "${question}"`);
        return cached;
      }
    }

    const prefilterResult = this.prefilterDangerousQuestion(question);
    if (prefilterResult) {
      if (this.useCache) {
        this.cache.store(question, prefilterResult);
      }
      return prefilterResult;
    }

    const classification = await this.aiBasedClassification(question);
    if (this.useCache) {
      this.cache.store(question, classification);
    }
    return classification;
  }

  /**
   * Quickly checks if the question contains dangerous or inappropriate content.
   * @param question - The question to check.
   * @returns A "dangerous" classification if matched, otherwise null.
   */
  private prefilterDangerousQuestion(
    question: string,
  ): QuestionClassification | null {
    const lowerCaseQuestion = question.toLowerCase();
    for (const concept of this.dangerousConcepts) {
      if (lowerCaseQuestion.includes(concept)) {
        return {
          classification: 'dangerous',
          reason: `The question contains dangerous content: "${concept}"`,
          model: 'prefilter',
          userPrompt: '',
          systemPrompt: '',
          promptVersion: this.promptVersion,
        };
      }
    }
    return null;
  }

  private async aiBasedClassification(
    question: string,
  ): Promise<QuestionClassification> {
    const { getPrompts } = QuestionClassificationPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(this.promptVersion);
    const userPrompt = getUserPrompt(question);

    const {
      object: { reason, classification },
    } = await this.llmProviderClient.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema: QuestionClassificationSchema,
      model: this.modelName,
    });
    return {
      classification,
      reason,
      userPrompt,
      systemPrompt,
      model: this.modelName,
      promptVersion: this.promptVersion,
    };
  }
}
