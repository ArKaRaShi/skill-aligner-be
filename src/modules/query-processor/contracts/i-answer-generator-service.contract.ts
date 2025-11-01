import { CourseMatch } from 'src/modules/course/types/course.type';

export const I_ANSWER_GENERATOR_SERVICE_TOKEN = Symbol(
  'IAnswerGeneratorService',
);

export interface IAnswerGeneratorService {
  generateAnswer(
    question: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<string>;
}
