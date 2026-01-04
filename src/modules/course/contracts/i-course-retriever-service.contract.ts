import { EmbeddingResultMetadata } from 'src/shared/adapters/embedding/providers/base-embedding-provider.abstract';
import { EmbeddingMetadata } from 'src/shared/contracts/types/embedding.type';
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

type Skill = string;

// Output type including embedding usage per skill
export type CourseRetrieverOutput = {
  coursesBySkill: Map<Skill, CourseWithLearningOutcomeV2Match[]>;
  embeddingsUsage: Map<Skill, EmbeddingResultMetadata>;
};

export interface ICourseRetrieverService {
  /**
   * Find courses by skills with optional filters.
   * @param params - The parameters for finding courses by skills.
   * @returns Courses grouped by skill, plus embedding usage metadata per skill.
   */
  getCoursesWithLosBySkillsWithFilter: (
    params: FindCoursesWithLosBySkillsWithFilterParams,
  ) => Promise<CourseRetrieverOutput>;
}
