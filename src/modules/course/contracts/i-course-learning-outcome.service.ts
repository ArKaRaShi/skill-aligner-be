import { Identifier } from 'src/common/domain/types/identifier';

import { LearningOutcomeMatch } from '../types/course-learning-outcome-v2.type';
import type { AcademicYearSemesterFilter } from './i-course-learning-outcome.repository';

export const I_COURSE_LEARNING_OUTCOME_SERVICE_TOKEN = Symbol(
  'ICourseLearningOutcomeService',
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

export interface ICourseLearningOutcomeService {
  /**
   * Find learning outcomes by multiple skills with optional LLM filtering.
   * @param params The parameters for finding learning outcomes.
   * @returns A map where the key is the skill and the value is an array of filtered learning outcome matches.
   */
  getLosBySkillsWithFilter({
    skills,
    threshold,
    topN,
    vectorDimension,
    enableLlmFilter,
    campusId,
    facultyId,
    isGenEd,
    academicYearSemesters,
  }: FindLosBySkillsWithFilterParams): Promise<
    Map<string, LearningOutcomeMatch[]>
  >;
}
