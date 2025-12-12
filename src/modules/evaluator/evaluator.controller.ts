import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';

import { BaseResponseDto } from 'src/common/adapters/primary/dto/responses/base.response.dto';

import { CollapsedIterationMetrics } from './types/test-result.type';
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currentIteration: {
          type: 'number',
          example: 1,
        },
        prefixDir: {
          type: 'string',
          example: 'test-set-v5-prompt-v5',
        },
      },
      required: ['currentIteration', 'prefixDir'],
    },
  })
  async evaluateQuestionClassification(
    @Body() body: { currentIteration: number; prefixDir: string },
  ): Promise<BaseResponseDto<null>> {
    const { currentIteration, prefixDir } = body;
    await this.questionClassificationEvaluatorService.evaluateTestSet(
      currentIteration,
      prefixDir,
    );
    return new BaseResponseDto<null>({
      message: 'Question classification evaluation completed successfully',
      data: null,
    });
  }

  @Post('/question-classification/collapsed-metrics')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prefixDir: {
          type: 'string',
          example: 'test-set-v5-prompt-v5',
        },
        iterationNumbers: {
          type: 'array',
          items: { type: 'number' },
          example: [1, 2, 3],
        },
      },
      required: ['prefixDir', 'iterationNumbers'],
    },
  })
  async getCollapsedMetrics(
    @Body()
    body: { prefixDir: string; iterationNumbers: number[] },
  ): Promise<BaseResponseDto<CollapsedIterationMetrics[]>> {
    const { prefixDir, iterationNumbers } = body;
    const collapsedMetrics =
      await this.questionClassificationEvaluatorService.getCollapsedIterationMetrics(
        iterationNumbers,
        prefixDir,
      );
    return new BaseResponseDto<CollapsedIterationMetrics[]>({
      message: 'Collapsed iteration metrics generated successfully',
      data: collapsedMetrics,
    });
  }
}
