import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import { SuccessResponseDto } from 'src/shared/contracts/api/base.response.dto';
import type { Identifier } from 'src/shared/contracts/types/identifier';

import { LogCourseClickUseCase } from '../../../use-cases/log-course-click.use-case';
import { LogCourseClickRequestDto } from './dto/requests/log-course-click.request.dto';
import { LogCourseClickResponseDto } from './dto/responses/log-course-click.response.dto';

/**
 * Controller for course-related operations
 */
@Controller()
export class CourseController {
  constructor(private readonly logCourseClickUseCase: LogCourseClickUseCase) {}

  /**
   * Log a course click event
   * This endpoint is public (no authentication required) and idempotent
   *
   * @param courseId - Course ID from path parameter
   * @param body - Request body containing questionId
   */
  @Post('/courses/:courseId/click')
  @HttpCode(HttpStatus.OK)
  async logClick(
    @Param('courseId') courseId: string,
    @Body() body: LogCourseClickRequestDto,
  ): Promise<SuccessResponseDto<LogCourseClickResponseDto>> {
    const result = await this.logCourseClickUseCase.execute({
      questionId: body.questionId as Identifier,
      courseId: courseId as Identifier,
    });

    const response: LogCourseClickResponseDto = {
      id: result.id,
      questionId: result.questionId,
      courseId: result.courseId,
      createdAt: result.createdAt,
    };

    return new SuccessResponseDto<LogCourseClickResponseDto>({
      message: 'Course click logged successfully',
      data: response,
    });
  }
}
