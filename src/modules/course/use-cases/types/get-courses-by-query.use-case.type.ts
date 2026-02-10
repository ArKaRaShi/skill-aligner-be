import { QueryEmbeddingUsage } from 'src/shared/contracts/types/embedding-usage.type';
import { Identifier } from 'src/shared/contracts/types/identifier';

import type { AcademicYearSemesterFilter } from '../../contracts/i-course-learning-outcome-repository.contract';
import { CourseViewWithSimilarity } from '../../types/course.type';

export type GetCoursesByQueryUseCaseInput = {
  query: string;
  campusId?: Identifier;
  facultyId?: Identifier;
  isGenEd?: boolean;
  academicYearSemesters?: AcademicYearSemesterFilter[];
  loThreshold?: number;
  topNLos?: number;
  /** Embedding model to use (e.g., 'e5-base', 'text-embedding-3-small'). Falls back to default if not specified. */
  embeddingModel?: string;
};

export type GetCoursesByQueryUseCaseOutput = {
  courses: CourseViewWithSimilarity[];
  embeddingUsage: QueryEmbeddingUsage;
};
