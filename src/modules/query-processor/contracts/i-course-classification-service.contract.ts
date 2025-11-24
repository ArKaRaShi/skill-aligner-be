import { CourseMatch } from 'src/modules/course/types/course.type';

import { CourseClassificationResult } from '../types/course-classification.type';

export const I_COURSE_CLASSIFICATION_SERVICE_TOKEN = Symbol(
  'ICourseClassificationService',
);

export interface ICourseClassificationService {
  /**
   * Classifies courses based on user question and course-skill mappings.
   * @param question The user's question
   * @param skillCourseMatchMap Map of skills to their corresponding courses
   * @returns Classification result with decisions and reasons
   */
  classifyCourses(
    question: string,
    skillCourseMatchMap: Map<string, CourseMatch[]>,
  ): Promise<CourseClassificationResult>;
}
