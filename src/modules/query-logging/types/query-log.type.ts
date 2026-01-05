import type { AcademicYearSemesterFilter } from '../../../shared/contracts/types/academic-year-semester-filter.type';
import type { Identifier } from '../../../shared/contracts/types/identifier';
import type { QueryStatus } from './query-status.type';

/**
 * Domain type for query process log.
 */
export interface QueryProcessLog {
  id: Identifier;
  status: QueryStatus;
  question: string;

  // Flexible JSONB fields
  input?: QueryLogInput;
  output?: QueryLogOutput;
  metrics?: QueryLogMetrics;
  metadata?: Record<string, any>;
  error?: QueryLogError;

  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input data stored in QueryProcessLog.input
 */
export interface QueryLogInput {
  question: string;
  campusId?: string;
  facultyId?: string;
  isGenEd?: boolean;
  academicYearSemesters?: AcademicYearSemesterFilter[];
}

/**
 * Output data stored in QueryProcessLog.output
 */
export interface QueryLogOutput {
  answer?: string;
  suggestQuestion?: string;
  relatedCourses?: RelatedCourseInfo[];
  classification?: ClassificationInfo;
}

/**
 * Related course information.
 */
export interface RelatedCourseInfo {
  courseCode: string;
  courseName: string;
}

/**
 * Classification information for early exit.
 */
export interface ClassificationInfo {
  category: 'relevant' | 'irrelevant' | 'dangerous';
  reason: string;
}

/**
 * Metrics stored in QueryProcessLog.metrics
 */
export interface QueryLogMetrics {
  totalDuration?: number; // milliseconds
  totalTokens?: TokenTotals;
  totalCost?: number;
  embeddingCost?: number; // Separate embedding cost (may be 0 for local models)
  cache?: CacheStats;
  counts?: CountStats;
}

/**
 * Token totals.
 */
export interface TokenTotals {
  input: number;
  output: number;
  total: number;
}

/**
 * Cache statistics.
 */
export interface CacheStats {
  hits: number;
  misses: number;
}

/**
 * Count statistics.
 */
export interface CountStats {
  skillsExtracted?: number;
  coursesRetrieved?: number;
  coursesFiltered?: number;
  coursesReturned?: number;
}

/**
 * Error information.
 */
export interface QueryLogError {
  code?: string;
  message: string;
  stack?: string;
}
