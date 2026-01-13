import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';

import { Observable } from 'rxjs';
import { SuccessResponseDto } from 'src/shared/contracts/api/base.response.dto';

import { AnswerQuestionRequestDto } from './dto/requests/answer-question.request.dto';
import { AnswerQuestionResponseDto } from './dto/responses/answer-question.response.dto';
import { CourseResponseMapper } from './mappers/course-response.mapper';
import { AnswerQuestionStreamUseCase } from './use-cases/answer-question-stream.use-case';
import { AnswerQuestionUseCase } from './use-cases/answer-question.use-case';
import { AnswerQuestionUseCaseInput } from './use-cases/inputs/answer-question.use-case.input';

@Controller()
export class QueryProcessorController {
  // TODO: This must be wrapped in facade pattern if there are multiple use-cases
  constructor(
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
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  answerQuestionStream(
    @Body() body: AnswerQuestionRequestDto,
  ): Observable<MessageEvent> {
    return this.answerQuestionStreamUseCase.execute(
      new AnswerQuestionUseCaseInput(body),
    );
  }
}
