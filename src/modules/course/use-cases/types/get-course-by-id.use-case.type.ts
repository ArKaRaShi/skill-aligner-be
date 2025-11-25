import { Identifier } from 'src/common/domain/types/identifier';

import { Course } from '../../types/course.type';

export type GetCourseByIdUseCaseInput = {
  courseId: Identifier;
};

export type GetCourseByIdUseCaseOutput = {
  course: Course;
};
