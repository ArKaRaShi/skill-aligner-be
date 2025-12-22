import { CourseView } from 'src/modules/course/types/course.type';

export type AnswerQuestionUseCaseOutput = {
  answer: string | null;
  suggestQuestion: string | null;
  relatedCourses: CourseView[];
};
