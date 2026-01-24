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
// ANALYTICS REPORT TYPES (5 Key Metrics)
// ============================================================================

/**
 * Per-skill performance summary.
 * Data source: Stage 4 (COURSE_RELEVANCE_FILTER) - allSkillsMetrics
 */
export interface PerSkillSummary {
  skill: string;
  frequency: number;
  avgRetrieved: number;
  avgAccepted: number;
  avgScore: number;
  acceptRate: number;
}

/**
 * Funnel metrics showing course reduction through stages.
 */
export interface FunnelMetrics {
  retrieved: number;
  accepted: number;
  unique: number;
  acceptRate: number;
}

/**
 * Skill-pair overlap (courses claimed by both skills).
 */
export interface SkillOverlap {
  skillA: string;
  skillB: string;
  sharedCourseCount: number;
}

/**
 * Multi-CLO acceptance patterns.
 * Groups courses by how many CLOs matched, then checks acceptance.
 */
export interface MultiCloAcceptance {
  cloCount: number;
  cloCountLabel: string;
  occurrences: number;
  accepted: number;
  acceptRate: number;
}

/**
 * LLM score distribution across all courses.
 */
export interface ScoreDistribution {
  score: number;
  count: number;
  percentage: number;
}

/**
 * Complete analytics report with all 5 metrics.
 */
export interface AnalyticsReport {
  perSkillSummary: PerSkillSummary[];
  funnelMetrics: FunnelMetrics;
  skillOverlaps: SkillOverlap[];
  multiCloAcceptance: MultiCloAcceptance[];
  scoreDistribution: ScoreDistribution[];
}
