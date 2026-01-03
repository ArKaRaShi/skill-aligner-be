import { EmbeddingMetadata } from 'src/shared/adapters/embedding/clients';
import { Identifier } from 'src/shared/contracts/types/identifier';

import { CourseWithLearningOutcomeV2Match } from '../types/course.type';
import type { AcademicYearSemesterFilter } from './i-course-learning-outcome-repository.contract';

export const I_COURSE_RETRIEVER_SERVICE_TOKEN = Symbol(
  'ICourseRetrieverService',
);

export type FindCoursesWithLosBySkillsWithFilterParams = {
  skills: string[];
  embeddingConfiguration: EmbeddingMetadata;
  loThreshold?: number;
  topNLos?: number;
  vectorDimension?: number;
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
    params: FindCoursesWithLosBySkillsWithFilterParams,
  ) => Promise<Map<string, CourseWithLearningOutcomeV2Match[]>>;
}
