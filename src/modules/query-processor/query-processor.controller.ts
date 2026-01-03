import { Body, Controller, Post } from '@nestjs/common';

import { BaseResponseDto } from 'src/shared/contracts/api/base.response.dto';

import { AnswerQuestionRequestDto } from './dto/requests/answer-question.request.dto';
import { AnswerQuestionResponseDto } from './dto/responses/answer-question.response.dto';
import { CourseResponseMapper } from './mappers/course-response.mapper';
import { AnswerQuestionUseCase } from './use-cases/answer-question.use-case';
import { AnswerQuestionUseCaseInput } from './use-cases/inputs/answer-question.use-case.input';

@Controller()
export class QueryProcessorController {
  // TODO: This must be wrapped in facade pattern if there are multiple use-cases
  constructor(private readonly answerQuestionUseCase: AnswerQuestionUseCase) {}

  @Post('/query-processor/answer-question')
  async answerQuestion(
    @Body() body: AnswerQuestionRequestDto,
  ): Promise<BaseResponseDto<AnswerQuestionResponseDto>> {
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

    return new BaseResponseDto<AnswerQuestionResponseDto>({
      message: 'Question answered successfully',
      data: mappedResult,
    });
  }
}
