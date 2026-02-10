import type { Identifier } from 'src/shared/contracts/types/identifier';

import type { CourseClickLog } from '../../types/course-click-log.type';

export type LogCourseClickUseCaseInput = {
  questionId: Identifier;
  courseId: Identifier;
};

export type LogCourseClickUseCaseOutput = CourseClickLog;
