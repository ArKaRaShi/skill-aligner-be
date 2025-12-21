import { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import { CourseClassificationResult } from '../types/course-classification.type';
import { QueryProfile } from '../types/query-profile.type';

export const I_COURSE_CLASSIFICATION_SERVICE_TOKEN = Symbol(
  'ICourseClassificationService',
);

export interface ICourseClassificationService {
  /**
   * Classifies courses based on user question, query profile, and course-skill mappings.
   * @param question The user's question
   * @param queryProfile The user's query profile containing intents, preferences, and background
   * @param skillCourseMatchMap Map of skills to their corresponding courses
   * @returns Classification result with decisions and reasons
   */
  classifyCourses(
    question: string,
    queryProfile: QueryProfile,
    skillCourseMatchMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
  ): Promise<CourseClassificationResult>;
}
