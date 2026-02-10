import { GetCourseByIdUseCase } from './get-course-by-id.use-case';
import { GetCoursesByQueryUseCase } from './get-courses-by-query.use-case';
import { LogCourseClickUseCase } from './log-course-click.use-case';

export const CourseUseCases = [
  GetCourseByIdUseCase,
  GetCoursesByQueryUseCase,
  LogCourseClickUseCase,
];
