import { Identifier } from 'src/common/domain/types/identifier';

import { EmbeddingMetadata } from 'src/modules/embedding/clients';

import { MatchedLearningOutcome } from '../types/course-learning-outcome-v2.type';

export const I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN = Symbol(
  'ICourseLearningOutcomeRepository',
);

export type AcademicYearSemesterFilter = {
  academicYear: number;
  semesters?: number[];
};

export type FindLosBySkillsParams = {
  skills: string[];
  embeddingConfiguration: EmbeddingMetadata;
  threshold?: number;
  topN?: number;
  campusId?: Identifier;
  facultyId?: Identifier;
  genEdOnly?: boolean;
  academicYearSemesters?: AcademicYearSemesterFilter[];
};

export interface ICourseLearningOutcomeRepository {
  /**
   * Find learning outcomes by multiple skills via semantic search.
   * @param params The parameters for finding learning outcomes.
   * @returns A map where the key is the skill and the value is an array of learning outcome matches.
   */
  findLosBySkills({
    skills,
    embeddingConfiguration,
    threshold,
    topN,

    // user preference filters
    campusId,
    facultyId,
    genEdOnly,
    academicYearSemesters,
  }: FindLosBySkillsParams): Promise<Map<string, MatchedLearningOutcome[]>>;
}
