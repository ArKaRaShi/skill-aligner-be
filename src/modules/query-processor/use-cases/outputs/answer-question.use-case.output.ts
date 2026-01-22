import type { Identifier } from 'src/shared/contracts/types/identifier';

import { CourseView } from 'src/modules/course/types/course.type';

export type AnswerQuestionUseCaseOutput = {
  answer: string | null;
  suggestQuestion: string | null;
  relatedCourses: CourseView[];
  questionLogId: Identifier | null;
};
