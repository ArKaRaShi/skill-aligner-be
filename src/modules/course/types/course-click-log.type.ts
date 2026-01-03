import { Identifier } from 'src/shared/domain/value-objects/identifier';

export type CourseClickLog = {
  id: Identifier;
  questionId: Identifier;
  courseId: Identifier;
  createdAt: Date;
};
