import { Identifier } from 'src/shared/domain/value-objects/identifier';

import { Course } from '../../types/course.type';

export type GetCourseByIdUseCaseInput = {
  courseId: Identifier;
};

export type GetCourseByIdUseCaseOutput = {
  course: Course;
};
