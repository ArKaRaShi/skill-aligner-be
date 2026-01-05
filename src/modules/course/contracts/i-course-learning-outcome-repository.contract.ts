import { EmbeddingUsage } from 'src/shared/contracts/types/embedding-usage.type';
import { EmbeddingMetadata } from 'src/shared/contracts/types/embedding.type';
import { Identifier } from 'src/shared/contracts/types/identifier';

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
  isGenEd?: boolean;
  academicYearSemesters?: AcademicYearSemesterFilter[];
};

type Skill = string;

export type FindLosBySkillsOutput = {
  losBySkill: Map<Skill, MatchedLearningOutcome[]>;
  embeddingUsage: EmbeddingUsage;
};

export interface ICourseLearningOutcomeRepository {
  /**
   * Find learning outcomes by multiple skills via semantic search.
   * @param params The parameters for finding learning outcomes.
   * @returns Learning outcomes grouped by skill, plus embedding usage metadata per skill and aggregated usage.
   */
  findLosBySkills({
    skills,
    embeddingConfiguration,
    threshold,
    topN,

    // user preference filters
    campusId,
    facultyId,
    isGenEd,
    academicYearSemesters,
  }: FindLosBySkillsParams): Promise<FindLosBySkillsOutput>;
}
