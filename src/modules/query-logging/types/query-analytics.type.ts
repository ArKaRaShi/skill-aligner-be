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
