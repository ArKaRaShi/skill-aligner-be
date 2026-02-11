import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SuccessResponseDto } from 'src/shared/contracts/api/base.response.dto';

import { QuestionClassificationPromptVersion } from 'src/modules/query-processor/prompts/question-classification';

import { QuestionClassificationEvaluatorService } from './question-classification/evaluators/question-classification-evaluator.service';
import { QuestionSetCreatorService } from './shared/services/question-set-creator.service';
import { CollapsedIterationMetrics } from './shared/types/test-result.type';

@Controller('evaluator')
@Throttle({ default: { limit: 5, ttl: 60000 } })
export class EvaluatorController {
  constructor(
    private readonly questionSetCreatorService: QuestionSetCreatorService,
    private readonly questionClassificationEvaluatorService: QuestionClassificationEvaluatorService,
  ) {}

  @Post('/question-set/generate')
  @HttpCode(HttpStatus.OK)
  async generateQuestionSet(): Promise<SuccessResponseDto<null>> {
    await this.questionSetCreatorService.createQuestionSet();
    return new SuccessResponseDto<null>({
      message: 'Question set generation completed successfully',
      data: null,
    });
  }

  @Post('/question-classification/evaluate')
  @HttpCode(HttpStatus.OK)
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
        promptVersion: {
          type: 'string',
          example: 'v6',
        },
      },
      required: ['currentIteration', 'prefixDir', 'promptVersion'],
    },
  })
  async evaluateQuestionClassification(
    @Body()
    body: {
      currentIteration: number;
      prefixDir: string;
      promptVersion: QuestionClassificationPromptVersion;
    },
  ): Promise<SuccessResponseDto<null>> {
    const { currentIteration, prefixDir, promptVersion } = body;
    await this.questionClassificationEvaluatorService.evaluateTestSet(
      currentIteration,
      prefixDir,
      promptVersion,
    );
    return new SuccessResponseDto<null>({
      message: 'Question classification evaluation completed successfully',
      data: null,
    });
  }

  @Post('/question-classification/collapsed-metrics')
  @HttpCode(HttpStatus.OK)
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
    body: {
      prefixDir: string;
      iterationNumbers: number[];
    },
  ): Promise<SuccessResponseDto<CollapsedIterationMetrics[]>> {
    const { prefixDir, iterationNumbers } = body;
    const collapsedMetrics =
      await this.questionClassificationEvaluatorService.getCollapsedIterationMetrics(
        iterationNumbers,
        prefixDir,
      );
    return new SuccessResponseDto<CollapsedIterationMetrics[]>({
      message: 'Collapsed iteration metrics generated successfully',
      data: collapsedMetrics,
    });
  }
}
