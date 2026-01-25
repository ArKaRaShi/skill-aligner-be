import {
  EmbeddingUsage,
  QueryEmbeddingUsage,
} from 'src/shared/contracts/types/embedding-usage.type';
import { Identifier } from 'src/shared/contracts/types/identifier';

import { CourseWithLearningOutcomeV2Match } from '../types/course.type';
import type { AcademicYearSemesterFilter } from './i-course-learning-outcome-repository.contract';

export const I_COURSE_RETRIEVER_SERVICE_TOKEN = Symbol(
  'ICourseRetrieverService',
);

export type FindCoursesWithLosBySkillsWithFilterParams = {
  skills: string[];
  loThreshold?: number;
  topNLos?: number;
  vectorDimension?: number;
  enableLlmFilter?: boolean;
  campusId?: Identifier;
  facultyId?: Identifier;
  isGenEd?: boolean;
  academicYearSemesters?: AcademicYearSemesterFilter[];
  /** Embedding model to use (e.g., 'e5-base', 'text-embedding-3-small'). Falls back to default if not specified. */
  embeddingModel?: string;
};

type Skill = string;

// Output type including embedding usage per skill and aggregated usage
export type CourseRetrieverOutput = {
  coursesBySkill: Map<Skill, CourseWithLearningOutcomeV2Match[]>;
  embeddingUsage: EmbeddingUsage;
};

export type FindLosByQueryWithFilterParams = {
  query: string;
  loThreshold?: number;
  topNLos?: number;
  campusId?: Identifier;
  facultyId?: Identifier;
  isGenEd?: boolean;
  academicYearSemesters?: AcademicYearSemesterFilter[];
  /** Embedding model to use (e.g., 'e5-base', 'text-embedding-3-small'). Falls back to default if not specified. */
  embeddingModel?: string;
};

export type CoursesByQueryOutput = {
  courses: CourseWithLearningOutcomeV2Match[];
  embeddingUsage: QueryEmbeddingUsage;
};

export interface ICourseRetrieverService {
  /**
   * Find courses by skills with optional filters.
   * @param params - The parameters for finding courses by skills.
   * @returns Courses grouped by skill, plus embedding usage metadata per skill and aggregated usage.
   */
  getCoursesWithLosBySkillsWithFilter: (
    params: FindCoursesWithLosBySkillsWithFilterParams,
  ) => Promise<CourseRetrieverOutput>;

  /**
   * Find courses by a single query string with optional filters.
   * @param params - The parameters for finding courses by query.
   * @returns Courses ranked by similarity score, with matched learning outcomes, plus embedding usage metadata.
   */
  getCoursesByQuery: (
    params: FindLosByQueryWithFilterParams,
  ) => Promise<CoursesByQueryOutput>;
}
