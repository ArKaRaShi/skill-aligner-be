import { Logger } from '@nestjs/common';

import type { IQueryLoggingRepository } from '../contracts/i-query-logging-repository.contract';
import { CostStatisticsHelper } from '../helpers/cost-statistics.helper';
import type {
  CombinedAnalyticsReport,
  CostBreakdownStatistics,
  CostStatistics,
  PerRunCostSummary,
  QueryAnalyticsOptions,
  TokenBreakdownStatistics,
} from '../types/query-analytics.type';
import type { CostBreakdown, QueryProcessLog } from '../types/query-log.type';
import type { QueryStatus } from '../types/query-status.type';

/**
 * Query Analytics Service
 *
 * Provides cost and token analytics by aggregating and computing statistics
 * from query logs. Uses the repository to fetch logs and the
 * CostStatisticsHelper to compute statistics.
 *
 * @example
 * ```ts
 * const analytics = await analyticsService.getCombinedAnalytics();
 * console.log(`Average LLM cost: $${analytics.costs.llm.average}`);
 * console.log(`Average LLM input tokens: ${analytics.tokens.llmInput.average}`);
 * ```
 */
export class QueryAnalyticsService {
  private readonly logger = new Logger(QueryAnalyticsService.name);

  constructor(private readonly repository: IQueryLoggingRepository) {}

  /**
   * Get average cost per completed query.
   *
   * @param options - Optional filters for date range and status
   * @returns Average cost breakdown (llm, embedding, total)
   */
  async getAverageCost(
    options?: Omit<QueryAnalyticsOptions, 'status'>,
  ): Promise<{ llm: number; embedding: number; total: number }> {
    this.logger.debug('Computing average cost');

    const logs = await this.repository.findManyWithMetrics({
      ...options,
      status: ['COMPLETED'],
      hasMetrics: true,
    });

    if (logs.length === 0) {
      return { llm: 0, embedding: 0, total: 0 };
    }

    const stats = this.computeCostBreakdownStats(logs);

    return {
      llm: stats.llm.average,
      embedding: stats.embedding.average,
      total: stats.total.average,
    };
  }

  /**
   * Get comprehensive cost breakdown statistics.
   *
   * @param options - Optional filters for date range and status
   * @returns Full cost breakdown statistics with count, sum, average, min, max
   */
  async getCostBreakdownStats(
    options?: QueryAnalyticsOptions,
  ): Promise<CostBreakdownStatistics> {
    const defaultStatus: QueryStatus[] = options?.status ?? ['COMPLETED'];
    const logs = await this.repository.findManyWithMetrics({
      ...options,
      status: defaultStatus,
      hasMetrics: true,
    });

    return this.computeCostBreakdownStats(logs);
  }

  /**
   * Get comprehensive token breakdown statistics.
   *
   * @param options - Optional filters for date range and status
   * @returns Full token breakdown statistics with count, sum, average, min, max
   */
  async getTokenBreakdownStats(
    options?: QueryAnalyticsOptions,
  ): Promise<TokenBreakdownStatistics> {
    const defaultStatus: QueryStatus[] = options?.status ?? ['COMPLETED'];
    const logs = await this.repository.findManyWithMetrics({
      ...options,
      status: defaultStatus,
      hasMetrics: true,
    });

    return this.computeTokenBreakdownStats(logs);
  }

  /**
   * Get combined analytics with both cost and token statistics.
   *
   * @param options - Optional filters for date range and status
   * @returns Combined report with cost and token statistics
   */
  async getCombinedAnalytics(
    options?: QueryAnalyticsOptions,
  ): Promise<CombinedAnalyticsReport> {
    const defaultStatus: QueryStatus[] = options?.status ?? ['COMPLETED'];
    const logs = await this.repository.findManyWithMetrics({
      ...options,
      status: defaultStatus,
      hasMetrics: true,
    });

    return {
      costs: this.computeCostBreakdownStats(logs),
      tokens: this.computeTokenBreakdownStats(logs),
    };
  }

  /**
   * Get per-run cost summary for individual logs.
   *
   * @param options - Optional filters
   * @param limit - Maximum number of logs to return (default: 100)
   * @returns Array of per-run cost summaries
   */
  async getPerRunCosts(
    options?: QueryAnalyticsOptions,
    limit = 100,
  ): Promise<PerRunCostSummary[]> {
    const logs = await this.repository.findManyWithMetrics({
      ...options,
      hasMetrics: true,
      take: limit,
    });

    return logs
      .filter(
        (log): log is QueryProcessLog & { metrics: { costs: CostBreakdown } } =>
          Boolean(log.metrics?.costs?.total),
      )
      .map((log) => ({
        logId: log.id,
        question: log.question,
        status: log.status,
        completedAt: log.completedAt ?? log.startedAt,
        costs: log.metrics.costs,
        tokens: log.metrics?.tokens,
        duration: log.metrics?.totalDuration,
      }));
  }

  /**
   * Compute cost breakdown statistics from an array of logs.
   *
   * @private
   */
  private computeCostBreakdownStats(
    logs: QueryProcessLog[],
  ): CostBreakdownStatistics {
    const llmCosts: number[] = [];
    const embeddingCosts: number[] = [];
    const totalCosts: number[] = [];

    for (const log of logs) {
      const costs = log.metrics?.costs;
      if (costs?.total != null) {
        totalCosts.push(costs.total);
        if (costs.llm != null) llmCosts.push(costs.llm);
        if (costs.embedding != null) embeddingCosts.push(costs.embedding);
      }
    }

    const llmStats = this.computeStatsFromArray(llmCosts);
    const embeddingStats = this.computeStatsFromArray(embeddingCosts);
    const totalStats = this.computeStatsFromArray(totalCosts);

    return {
      llm: llmStats,
      embedding: embeddingStats,
      total: totalStats,
    };
  }

  /**
   * Compute statistics from an array, handling empty arrays.
   *
   * @private
   */
  private computeStatsFromArray(values: number[]): CostStatistics {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
      };
    }
    return CostStatisticsHelper.computeStatistics(values);
  }

  /**
   * Compute token breakdown statistics from an array of logs.
   *
   * @private
   */
  private computeTokenBreakdownStats(
    logs: QueryProcessLog[],
  ): TokenBreakdownStatistics {
    const llmInputTokens: number[] = [];
    const llmOutputTokens: number[] = [];
    const llmTotalTokens: number[] = [];
    const embeddingTokens: number[] = [];
    const totalTokens: number[] = [];

    for (const log of logs) {
      const tokens = log.metrics?.tokens;
      if (tokens?.total != null) {
        totalTokens.push(tokens.total);
        if (tokens.llm != null) {
          llmInputTokens.push(tokens.llm.input);
          llmOutputTokens.push(tokens.llm.output);
          llmTotalTokens.push(tokens.llm.total);
        }
        if (tokens.embedding != null) {
          embeddingTokens.push(tokens.embedding.total);
        }
      }
    }

    return {
      llmInput: this.computeStatsFromArray(llmInputTokens),
      llmOutput: this.computeStatsFromArray(llmOutputTokens),
      llmTotal: this.computeStatsFromArray(llmTotalTokens),
      embeddingTotal: this.computeStatsFromArray(embeddingTokens),
      total: this.computeStatsFromArray(totalTokens),
    };
  }
}
