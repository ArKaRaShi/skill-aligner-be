import { Identifier } from 'src/shared/contracts/types/identifier';

export type CourseClickLog = {
  id: Identifier;
  questionId: Identifier;
  courseId: Identifier;
  createdAt: Date;
};
