import type { AcademicYearSemesterFilter } from '../../../shared/contracts/types/academic-year-semester-filter.type';
import type { Identifier } from '../../../shared/contracts/types/identifier';
import type { QueryStatus } from './query-status.type';

/**
 * Domain type for query process log.
 *
 * Note: Root-level fields use `| null` to align with Prisma/PostgreSQL conventions.
 * Prisma returns `null` for nullable columns, never `undefined`.
 * Optional parameters at the API/service layer use `?` (undefined = not provided).
 */
export interface QueryProcessLog {
  id: Identifier;
  status: QueryStatus;
  question: string;

  // JSONB fields - column itself can be null (Prisma returns null)
  input: QueryLogInput | null;
  output: QueryLogOutput | null;
  metrics: QueryLogMetrics | null;
  metadata: Record<string, any> | null;
  error: QueryLogError | null;

  // Direct Prisma scalar columns - nullable fields use | null
  totalDuration: number | null;
  totalTokens: number | null;
  totalCost: number | null;

  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input data stored in QueryProcessLog.input (JSONB field).
 *
 * Note: Nested properties use `?` following JavaScript convention.
 * Properties can be missing (undefined).
 */
export interface QueryLogInput {
  question: string;
  campusId?: string;
  facultyId?: string;
  isGenEd?: boolean;
  academicYearSemesters?: AcademicYearSemesterFilter[];
}

/**
 * Output data stored in QueryProcessLog.output (JSONB field).
 *
 * Note: Nested properties use `?` following JavaScript convention.
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
 * Serializable timing record for database storage (inside JSONB).
 * Matches TimingRecord from time-logger.helper.ts
 *
 * Note: Properties use `?` following JavaScript convention.
 */
export interface TimingRecordSerializable {
  start: number;
  end?: number;
  duration?: number;
}

/**
 * Serializable token usage for database storage (inside JSONB).
 * Matches TokenUsage from token-usage.type.ts
 */
export interface TokenUsageSerializable {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Serializable token cost estimate for database storage (inside JSONB).
 * Matches TokenCostEstimate from token-cost-calculator.helper.ts
 */
export interface TokenCostEstimateSerializable extends TokenUsageSerializable {
  available: boolean;
  estimatedCost: number;
}

/**
 * Serializable token record for database storage (inside JSONB).
 * Matches TokenRecord from token-logger.helper.ts
 */
export interface TokenRecordSerializable {
  usage: TokenUsageSerializable;
  costEstimate: TokenCostEstimateSerializable;
}

/**
 * Metrics stored in QueryProcessLog.metrics (JSONB field).
 *
 * Raw timing and token data are stored directly in a type-safe format.
 * Aggregations (averages, totals, LLM vs Embedding breakdowns)
 * are computed at query time using TokenLogger.getSummary().
 *
 * Note: Nested properties use `?` following JavaScript convention.
 */
export interface QueryLogMetrics {
  /** Raw timing data for each step */
  timing?: Record<string, TimingRecordSerializable>;

  /** Raw token map with all usage records */
  tokenMap?: Record<string, TokenRecordSerializable[]>;

  /** Simple counts that don't need calculation */
  counts?: CountStats;
}

/**
 * Token breakdown separating LLM and embedding tokens.
 */
export interface TokenBreakdown {
  llm?: {
    input: number;
    output: number;
    total: number;
  };
  embedding?: {
    total: number;
  };
  total: number; // llm.total + embedding.total
}

/**
 * Cost breakdown separating LLM and embedding costs.
 */
export interface CostBreakdown {
  llm?: number;
  embedding?: number;
  total: number; // llm + embedding
}

/**
 * Count statistics (inside JSONB).
 *
 * Note: Properties use `?` following JavaScript convention.
 */
export interface CountStats {
  skillsExtracted?: number;
  coursesReturned?: number;
}

/**
 * Error information (inside JSONB).
 *
 * Note: Properties use `?` following JavaScript convention.
 */
export interface QueryLogError {
  code?: string;
  message: string;
  stack?: string;
}
