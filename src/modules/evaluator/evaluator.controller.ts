import { Controller, Get, Post } from '@nestjs/common';

import { BaseResponseDto } from 'src/common/adapters/primary/dto/responses/base.response.dto';

import { QuestionClassificationEvaluatorService } from './services/question-classification-evaluator.service';
import { QuestionSetCreatorService } from './services/question-set-creator.service';

@Controller('evaluator')
export class EvaluatorController {
  constructor(
    private readonly questionSetCreatorService: QuestionSetCreatorService,
    private readonly questionClassificationEvaluatorService: QuestionClassificationEvaluatorService,
  ) {}

  @Post('/question-set/generate')
  async generateQuestionSet(): Promise<BaseResponseDto<null>> {
    await this.questionSetCreatorService.createQuestionSet();
    return new BaseResponseDto<null>({
      message: 'Question set generation completed successfully',
      data: null,
    });
  }

  @Post('/question-classification/evaluate')
  async evaluateQuestionClassification(): Promise<BaseResponseDto<null>> {
    await this.questionClassificationEvaluatorService.evaluateTestSet();
    return new BaseResponseDto<null>({
      message: 'Question classification evaluation completed successfully',
      data: null,
    });
  }
}
