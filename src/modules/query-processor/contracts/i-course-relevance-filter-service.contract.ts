import { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import { CourseRelevanceFilterPromptVersion } from '../prompts/course-relevance-filter';
import {
  CourseRelevanceFilterResult,
  CourseRelevanceFilterResultV2,
} from '../types/course-relevance-filter.type';

export const I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN = Symbol(
  'ICourseRelevanceFilterService',
);

export interface ICourseRelevanceFilterService {
  /**
   * Filters courses based on relevance to user question and course-skill mappings.
   * @param question The user's question
   * @param skillCourseMatchMap Map of skills to their corresponding courses
   * @returns Relevance filter result with filtered courses and relevance scores
   */
  batchFilterCoursesBySkill(
    question: string,
    skillCourseMatchMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
    promptVersion: CourseRelevanceFilterPromptVersion,
  ): Promise<CourseRelevanceFilterResult[]>;

  batchFilterCoursesBySkillV2(
    question: string,
    skillCourseMatchMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
    promptVersion: CourseRelevanceFilterPromptVersion,
  ): Promise<CourseRelevanceFilterResultV2[]>;
}
