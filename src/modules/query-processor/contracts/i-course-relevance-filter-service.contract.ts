import { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import { CourseRelevanceFilterPromptVersion } from '../prompts/course-relevance-filter';
import { CourseRelevanceFilterResult } from '../types/course-relevance-filter.type';
import { QueryProfile } from '../types/query-profile.type';

export const I_COURSE_RELEVANCE_FILTER_SERVICE_TOKEN = Symbol(
  'ICourseRelevanceFilterService',
);

export interface ICourseRelevanceFilterService {
  /**
   * Filters courses based on relevance to user question, query profile, and course-skill mappings.
   * @param question The user's question
   * @param queryProfile The user's query profile containing intents, preferences, and background
   * @param skillCourseMatchMap Map of skills to their corresponding courses
   * @returns Relevance filter result with filtered courses and relevance scores
   */
  batchFilterCoursesBySkill(
    question: string,
    queryProfile: QueryProfile,
    skillCourseMatchMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
    promptVersion: CourseRelevanceFilterPromptVersion,
  ): Promise<CourseRelevanceFilterResult[]>;
}
