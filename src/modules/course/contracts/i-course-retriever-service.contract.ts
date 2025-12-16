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
   * @returns A promise that resolves to a map where the keys are skill strings and the values are arrays of courses with learning outcome matches.
   */
  getCoursesBySkillsWithFilter: (
    params: FindLosBySkillsWithFilterParams,
  ) => Promise<Map<string, CourseWithLearningOutcomeV2Match[]>>;
}
