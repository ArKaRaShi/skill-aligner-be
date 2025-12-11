import { Identifier } from 'src/common/domain/types/identifier';

import { LearningOutcomeMatch } from '../types/course-learning-outcome-v2.type';

export const I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN = Symbol(
  'ICourseLearningOutcomeRepository',
);

type VectorDimension = 768 | 1536;

export type FindLosBySkillsParams = {
  skills: string[];
  threshold?: number;
  topN?: number;
  vectorDimension?: VectorDimension;
  campusId?: Identifier;
  facultyId?: Identifier;
  isGenEd?: boolean;
  academicYears?: number[];
  semesters?: number[];
};

export interface ICourseLearningOutcomeRepository {
  /**
   * Find learning outcomes by multiple skills via semantic search.
   * @param params The parameters for finding learning outcomes.
   * @returns A map where the key is the skill and the value is an array of learning outcome matches.
   */
  findLosBySkills({
    skills,
    threshold,
    topN,
    vectorDimension,

    // user preference filters
    campusId,
    facultyId,
    isGenEd,
    academicYears,
    semesters,
  }: FindLosBySkillsParams): Promise<Map<string, LearningOutcomeMatch[]>>;
}
