import type { CostBreakdown, TokenBreakdown } from './query-log.type';
import type { QueryStatus } from './query-status.type';

/**
 * Filter options for querying logs in analytics.
 */
export interface QueryAnalyticsOptions {
  startDate?: Date;
  endDate?: Date;
  status?: QueryStatus[];
}

/**
 * Simple statistics for a numeric dimension.
 */
export interface CostStatistics {
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
}

/**
 * Cost statistics breakdown by LLM, embedding, and total.
 */
export interface CostBreakdownStatistics {
  llm: CostStatistics;
  embedding: CostStatistics;
  total: CostStatistics;
}

/**
 * Token statistics breakdown by LLM input, LLM output, embedding, and total.
 */
export interface TokenBreakdownStatistics {
  llmInput: CostStatistics;
  llmOutput: CostStatistics;
  llmTotal: CostStatistics;
  embeddingTotal: CostStatistics;
  total: CostStatistics;
}

/**
 * Combined analytics report with both cost and token statistics.
 */
export interface CombinedAnalyticsReport {
  costs: CostBreakdownStatistics;
  tokens: TokenBreakdownStatistics;
}

/**
 * Per-run cost summary with minimal details.
 */
export interface PerRunCostSummary {
  logId: string;
  question: string;
  status: QueryStatus;
  completedAt: Date;
  costs: CostBreakdown;
  tokens?: TokenBreakdown;
  duration?: number;
}

// ============================================================================
// DISTRIBUTION ANALYTICS TYPES
// ============================================================================

/**
 * Question-level summary statistics.
 */
export interface QuestionLevelSummary {
  totalQueries: number;
  avgCoursesReturned: number;
  minCoursesReturned: number;
  maxCoursesReturned: number;
  stdDevCoursesReturned: number;
  avgSkillsExtracted: number;
  avgCostPerQuery: number;
  avgDurationPerQuery: number;
}

/**
 * Skill-level breakdown metrics.
 */
export interface SkillLevelBreakdown {
  skill: string;
  frequency: number;
  avgCoursesRetrieved: number;
  avgAcceptedCount: number;
  avgRejectedCount: number;
  acceptanceRate: number;
  rejectionRate: number;
}

/**
 * Aggregation metrics (fan-out, deduplication).
 */
export interface AggregationMetrics {
  avgRawCourses: number;
  avgUniqueCourses: number;
  avgDuplicatesRemoved: number;
  avgDuplicateRate: number;
  avgClosPerCourse: number;
}

/**
 * Correlation analysis metrics.
 */
export interface CorrelationMetrics {
  skillsVsCoursesCorrelation: number;
  costPerCourse: number;
  coursesPerSkill: number;
}

/**
 * Distribution bucket for histogram.
 */
export interface DistributionBucket {
  range: string;
  count: number;
  percentage: number;
}

/**
 * Complete distribution analytics report.
 */
export interface DistributionAnalyticsReport {
  questionLevel: QuestionLevelSummary;
  skillLevel: SkillLevelBreakdown[];
  aggregation: AggregationMetrics;
  correlation: CorrelationMetrics;
  distributionBuckets: DistributionBucket[];
}
