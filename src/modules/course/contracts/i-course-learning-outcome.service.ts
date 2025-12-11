import { Identifier } from 'src/common/domain/types/identifier';

import { LearningOutcomeMatch } from '../types/course-learning-outcome-v2.type';

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
  academicYears?: number[];
  semesters?: number[];
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
    academicYears,
    semesters,
  }: FindLosBySkillsWithFilterParams): Promise<
    Map<string, LearningOutcomeMatch[]>
  >;
}
