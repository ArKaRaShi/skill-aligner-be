import { Inject, Injectable, Logger } from '@nestjs/common';

import { IUseCase } from 'src/shared/contracts/i-use-case.contract';

import {
  I_QUESTION_CLASSIFIER_SERVICE_TOKEN,
  IQuestionClassifierService,
} from '../contracts/i-question-classifier-service.contract';
import { ClassifyQuestionUseCaseInput } from './inputs/classify-question.use-case.input';
import { ClassifyQuestionUseCaseOutput } from './outputs/classify-question.use-case.output';

@Injectable()
export class ClassifyQuestionUseCase
  implements
    IUseCase<ClassifyQuestionUseCaseInput, ClassifyQuestionUseCaseOutput>
{
  private readonly logger = new Logger(ClassifyQuestionUseCase.name);

  constructor(
    @Inject(I_QUESTION_CLASSIFIER_SERVICE_TOKEN)
    private readonly questionClassifierService: IQuestionClassifierService,
  ) {}

  async execute(
    input: ClassifyQuestionUseCaseInput,
  ): Promise<ClassifyQuestionUseCaseOutput> {
    this.logger.log(
      `Classifying question: "${input.question}" with prompt version: ${input.promptVersion}`,
    );

    const result = await this.questionClassifierService.classify({
      question: input.question,
      promptVersion: input.promptVersion,
    });

    this.logger.log(
      `Question classified as: "${result.category}" with reason: "${result.reason}"`,
    );

    return {
      category: result.category,
      reason: result.reason,
      llmInfo: result.llmInfo,
      tokenUsage: result.tokenUsage,
    };
  }
}
