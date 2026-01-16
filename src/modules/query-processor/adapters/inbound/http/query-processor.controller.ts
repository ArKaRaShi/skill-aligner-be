import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
} from '@nestjs/common';

import { Response } from 'express';
import { I_SSE_EMITTER_FACTORY_TOKEN } from 'src/shared/adapters/sse/sse-emitter.factory';
import { SseEmitterFactory } from 'src/shared/adapters/sse/sse-emitter.factory';
import { SuccessResponseDto } from 'src/shared/contracts/api/base.response.dto';

import { StepSseEvent } from '../../../types/sse-event.type';
import { AnswerQuestionStreamUseCase } from '../../../use-cases/answer-question-stream.use-case';
import { AnswerQuestionUseCase } from '../../../use-cases/answer-question.use-case';
import { AnswerQuestionStreamUseCaseInput } from '../../../use-cases/inputs/answer-question-stream.use-case.input';
import { AnswerQuestionUseCaseInput } from '../../../use-cases/inputs/answer-question.use-case.input';
import { AnswerQuestionStreamRequestDto } from './dto/requests/answer-question-stream.request.dto';
import { AnswerQuestionRequestDto } from './dto/requests/answer-question.request.dto';
import { AnswerQuestionResponseDto } from './dto/responses/answer-question.response.dto';
import { CourseResponseMapper } from './mappers/course-response.mapper';

@Controller()
export class QueryProcessorController {
  // TODO: This must be wrapped in facade pattern if there are multiple use-cases
  constructor(
    @Inject(I_SSE_EMITTER_FACTORY_TOKEN)
    private readonly sseEmitterFactory: SseEmitterFactory,
    private readonly answerQuestionUseCase: AnswerQuestionUseCase,
    private readonly answerQuestionStreamUseCase: AnswerQuestionStreamUseCase,
  ) {}

  @Post('/query-processor/answer-question')
  @HttpCode(HttpStatus.OK)
  async answerQuestion(
    @Body() body: AnswerQuestionRequestDto,
  ): Promise<SuccessResponseDto<AnswerQuestionResponseDto>> {
    const { question, isGenEd } = body;
    const { answer, suggestQuestion, relatedCourses } =
      await this.answerQuestionUseCase.execute(
        new AnswerQuestionUseCaseInput({
          question,
          isGenEd,
        }),
      );

    const mappedResult: AnswerQuestionResponseDto = {
      answer,
      suggestQuestion,
      relatedCourses: CourseResponseMapper.toCourseOutputDto(relatedCourses),
    };

    return new SuccessResponseDto<AnswerQuestionResponseDto>({
      message: 'Question answered successfully',
      data: mappedResult,
    });
  }

  @Post('/query-processor/answer-question-stream')
  @HttpCode(HttpStatus.OK)
  async answerQuestionStream(
    @Body() body: AnswerQuestionStreamRequestDto,
    @Res({ passthrough: false }) response: Response,
  ): Promise<void> {
    console.log('[Controller] SSE stream request received:', body.question);

    // Create emitter using factory
    const emitter = this.sseEmitterFactory.create<StepSseEvent>(response);

    try {
      // Execute pipeline with emitter
      await this.answerQuestionStreamUseCase.execute(
        new AnswerQuestionStreamUseCaseInput(body),
        emitter,
      );
      console.log('[Controller] Pipeline completed successfully');
      emitter.complete();
    } catch (error) {
      console.error('[Controller] Pipeline error:', error);
      emitter.error(error as Error);
    }
  }
}
