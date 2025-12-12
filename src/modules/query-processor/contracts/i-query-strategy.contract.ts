import { TimingMap } from 'src/common/helpers/time-logger.helper';

import { CourseMatch } from 'src/modules/course/types/course.type';

import { CourseClassificationResult } from '../types/course-classification.type';
import { QueryProfile } from '../types/query-profile.type';
import { SkillExpansion } from '../types/skill-expansion.type';
import { AnswerQuestionUseCaseOutput } from '../use-cases/types/answer-question.use-case.type';

export interface IQueryStrategy {
  /**
   * Executes the query processing strategy
   * @param question The user's question
   * @param queryProfile The processed query profile
   * @param timing Map for tracking execution timing
   * @returns Promise resolving to the answer output
   */
  execute(
    question: string,
    queryProfile: QueryProfile,
    timing: TimingMap,
  ): Promise<AnswerQuestionUseCaseOutput>;

  /**
   * Determines if this strategy should be used for the given query profile
   * @param queryProfile The processed query profile
   * @returns True if this strategy should handle the query
   */
  canHandle(queryProfile: QueryProfile): boolean;
}

export interface QueryStrategyContext {
  question: string;
  queryProfile: QueryProfile;
  timing: TimingMap;
  skillExpansion?: SkillExpansion | null;
  skillCoursesMap?: Map<string, CourseMatch[]>;
  classificationResult?: CourseClassificationResult;
}
