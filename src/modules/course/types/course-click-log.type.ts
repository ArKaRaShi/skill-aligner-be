import { Identifier } from 'src/common/domain/types/identifier';

export type CourseClickLog = {
  id: Identifier;
  questionId: Identifier;
  courseId: Identifier;
  createdAt: Date;
};
