import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { SuccessResponseDto } from 'src/shared/contracts/api/base.response.dto';
import type { Identifier } from 'src/shared/contracts/types/identifier';

import { GetCoursesByQueryUseCase } from '../../../use-cases/get-courses-by-query.use-case';
import { LogCourseClickUseCase } from '../../../use-cases/log-course-click.use-case';
import { LogCourseClickRequestDto } from './dto/requests/log-course-click.request.dto';
import { CourseSearchResponseDto } from './dto/responses/course-search-item.response.dto';
import { LogCourseClickResponseDto } from './dto/responses/log-course-click.response.dto';
import { CourseSearchResponseMapper } from './mappers/course-search-response.mapper';

/**
 * Controller for course-related operations
 */
@Controller()
export class CourseController {
  constructor(
    private readonly logCourseClickUseCase: LogCourseClickUseCase,
    private readonly getCoursesByQueryUseCase: GetCoursesByQueryUseCase,
  ) {}

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

  /**
   * Search courses by natural language query
   * Experimental: Semantic search using learning outcomes
   *
   * @example
   * GET /courses/search?query=machine+learning&loThreshold=0.7
   */
  @Get('/courses/search')
  @HttpCode(HttpStatus.OK)
  async searchCourses(
    @Query('query') query: string,
    @Query('loThreshold') loThreshold?: string,
    @Query('topNLos') topNLos?: string,
    @Query('campusId') campusId?: string,
    @Query('facultyId') facultyId?: string,
    @Query('isGenEd') isGenEd?: string,
    @Query('embeddingModel') embeddingModel?: string,
  ): Promise<SuccessResponseDto<CourseSearchResponseDto>> {
    const result = await this.getCoursesByQueryUseCase.execute({
      query,
      loThreshold: loThreshold ? Number.parseFloat(loThreshold) : undefined,
      topNLos: topNLos ? Number.parseInt(topNLos, 10) : undefined,
      campusId: campusId as Identifier | undefined,
      facultyId: facultyId as Identifier | undefined,
      isGenEd: isGenEd ? isGenEd === 'true' : undefined,
      academicYearSemesters: undefined,
      embeddingModel,
    });

    return new SuccessResponseDto<CourseSearchResponseDto>({
      message: 'Courses retrieved successfully',
      data: CourseSearchResponseMapper.toCourseSearchResponseDto(
        result.courses,
        result.embeddingUsage,
      ),
    });
  }
}
