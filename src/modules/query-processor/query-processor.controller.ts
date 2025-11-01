import { Body, Controller, Get, Post } from '@nestjs/common';

import { BaseResponseDto } from 'src/common/adapters/primary/dto/responses/base.response.dto';

import { AnswerQuestionRequestDto } from './dto/requests/answer-question.request.dto';
import { AnswerQuestionResponseDto } from './dto/responses/answer-question.response.dto';
import { AnswerQuestionUseCase } from './use-cases/answer-question.use-case';

@Controller()
export class QueryProcessorController {
  // TODO: This must be wrapped in facade pattern if there are multiple use-cases
  constructor(private readonly answerQuestionUseCase: AnswerQuestionUseCase) {}

  @Post('/query-processor/answer-question')
  async answerQuestion(
    @Body() body: AnswerQuestionRequestDto,
  ): Promise<BaseResponseDto<AnswerQuestionResponseDto>> {
    const { question } = body;
    const result = await this.answerQuestionUseCase.execute(question);
    return new BaseResponseDto<AnswerQuestionResponseDto>({
      message: 'Question answered successfully',
      data: result,
    });
  }
}
