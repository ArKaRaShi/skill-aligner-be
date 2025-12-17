import { Identifier } from 'src/common/domain/types/identifier';

import { CourseWithLearningOutcomeV2Match } from '../types/course.type';
import type { AcademicYearSemesterFilter } from './i-course-learning-outcome-repository.contract';

export const I_COURSE_RETRIEVER_SERVICE_TOKEN = Symbol(
  'ICourseRetrieverService',
);

export type FindLosBySkillsWithFilterParams = {
  skills: string[];
  threshold?: number;
  topN?: number;
  vectorDimension?: 768 | 1536;
  enableLlmFilter?: boolean;
  campusId?: Identifier;
  facultyId?: Identifier;
  isGenEd?: boolean;
  academicYearSemesters?: AcademicYearSemesterFilter[];
};

export interface ICourseRetrieverService {
  /**
   * Find courses by skills with optional filters.
   * @param params - The parameters for finding courses by skills.
   * @returns A map where the key is the skill and the value is an array of courses with learning outcome matche and all learning outcomes.
   */
  getCoursesWithLosBySkillsWithFilter: (
    params: FindLosBySkillsWithFilterParams,
  ) => Promise<Map<string, CourseWithLearningOutcomeV2Match[]>>;
}
