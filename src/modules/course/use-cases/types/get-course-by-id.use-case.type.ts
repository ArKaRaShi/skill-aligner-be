import { Identifier } from 'src/shared/contracts/types/identifier';

import { Course } from '../../types/course.type';

export type GetCourseByIdUseCaseInput = {
  courseId: Identifier;
};

export type GetCourseByIdUseCaseOutput = {
  course: Course;
};
