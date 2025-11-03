import { CourseMatch } from 'src/modules/course/types/course.type';

import { AnswerGeneration } from '../types/answer-generation.type';

export const I_ANSWER_GENERATOR_SERVICE_TOKEN = Symbol(
  'IAnswerGeneratorService',
);

export interface IAnswerGeneratorService {
  /**
   * Generates an answer based on the provided question and skill-course match map.
   * @param question The user's question.
   * @param skillCourseMatchMap The map of skills to their corresponding courses.
   */
  generateAnswer(
    question: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<AnswerGeneration>;
}
