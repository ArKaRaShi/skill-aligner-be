import { Injectable, Logger } from '@nestjs/common';

import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import type { IQueryLoggingRepository } from '../contracts/i-query-logging-repository.contract';
import { CostStatisticsHelper } from '../helpers/cost-statistics.helper';
import { PerRunCostSummarizerHelper } from '../helpers/per-run-cost-summarizer.helper';
import { TokenMapBreakdownHelper } from '../helpers/token-map-breakdown.helper';
import type {
  CombinedAnalyticsReport,
  CostBreakdownStatistics,
  CostStatistics,
  PerRunCostSummary,
  QueryAnalyticsOptions,
  TokenBreakdownStatistics,
} from '../types/query-analytics.type';
import type { QueryProcessLog } from '../types/query-log.type';
import { QUERY_STATUS, type QueryStatus } from '../types/query-status.type';

/**
 * Query Analytics Service
 *
 * Orchestrates query log analytics by fetching logs and computing statistics.
 * Delegates parsing and transformation to helper classes.
 *
 * @example
 * ```ts
 * const analytics = await analyticsService.getCombinedAnalytics();
 * console.log(`Average LLM cost: $${analytics.costs.llm.average}`);
 * console.log(`Average LLM input tokens: ${analytics.tokens.llmInput.average}`);
 * ```
 */
@Injectable()
export class QueryAnalyticsService {
  private readonly logger = new Logger(QueryAnalyticsService.name);

  constructor(private readonly repository: IQueryLoggingRepository) {}

  /**
   * Get average cost per completed query.
   *
   * @param options - Optional filters for date range
   * @returns Average cost breakdown (llm, embedding, total)
   */
  async getAverageCost(
    options?: Omit<QueryAnalyticsOptions, 'status'>,
  ): Promise<{ llm: number; embedding: number; total: number }> {
    this.logger.debug('Computing average cost', { options });

    const logs = await this.fetchLogsWithMetrics(options, ['COMPLETED']);

    if (logs.length === 0) {
      this.logger.warn('No completed logs found for average cost computation');
      return { llm: 0, embedding: 0, total: 0 };
    }

    const stats = this.computeCostBreakdownStats(logs);

    const result = {
      llm: stats.llm.average,
      embedding: stats.embedding.average,
      total: stats.total.average,
    };

    this.logger.log(
      `Average cost computed from ${logs.length} queries: LLM=$${DecimalHelper.formatCost(result.llm)}, Embedding=$${DecimalHelper.formatCost(result.embedding)}, Total=$${DecimalHelper.formatCost(result.total)}`,
    );

    return result;
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
    this.logger.debug('Fetching cost breakdown statistics', { options });

    const logs = await this.fetchLogsWithMetrics(options);

    if (logs.length === 0) {
      this.logger.warn('No logs found for cost breakdown statistics');
    }

    const result = this.computeCostBreakdownStats(logs);

    this.logger.log(
      `Cost breakdown stats computed: ${result.total.count} queries, Total=$${DecimalHelper.formatCost(result.total.sum)}`,
    );

    return result;
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
    this.logger.debug('Fetching token breakdown statistics', { options });

    const logs = await this.fetchLogsWithMetrics(options);

    if (logs.length === 0) {
      this.logger.warn('No logs found for token breakdown statistics');
    }

    const result = this.computeTokenBreakdownStats(logs);

    this.logger.log(
      `Token breakdown stats computed: ${result.total.count} queries, Total=${result.total.sum.toFixed(DECIMAL_PRECISION.TOKEN)} tokens`,
    );

    return result;
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
    this.logger.debug('Fetching combined analytics', { options });

    const logs = await this.fetchLogsWithMetrics(options);

    if (logs.length === 0) {
      this.logger.warn('No logs found for combined analytics');
    }

    const result = {
      costs: this.computeCostBreakdownStats(logs),
      tokens: this.computeTokenBreakdownStats(logs),
    };

    this.logger.log(
      `Combined analytics computed: ${result.costs.total.count} queries, Total Cost=$${DecimalHelper.formatCost(result.costs.total.sum)}, Total Tokens=${result.tokens.total.sum.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );

    return result;
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
    this.logger.debug('Fetching per-run costs', { options, limit });

    const logs = await this.fetchLogsWithMetrics(options, null, limit);
    const summaries = PerRunCostSummarizerHelper.toSummaryArray(logs);

    this.logger.log(
      `Per-run costs computed: ${summaries.length} runs (limit: ${limit})`,
    );

    return summaries;
  }

  /**
   * Fetch logs from repository with default options.
   *
   * @private
   */
  private async fetchLogsWithMetrics(
    options?: QueryAnalyticsOptions,
    defaultStatus: QueryStatus[] | null = [QUERY_STATUS.COMPLETED],
    limit?: number,
  ): Promise<QueryProcessLog[]> {
    return this.repository.findManyWithMetrics({
      ...options,
      status: options?.status ?? defaultStatus ?? undefined,
      hasMetrics: true,
      ...(limit ? { take: limit } : {}),
    });
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
      if (log.totalCost == null) continue;

      totalCosts.push(log.totalCost);

      const breakdown = TokenMapBreakdownHelper.extractBreakdown(
        log.metrics?.tokenMap,
      );

      if (breakdown.llmCost > 0) llmCosts.push(breakdown.llmCost);
      if (breakdown.embeddingCost > 0)
        embeddingCosts.push(breakdown.embeddingCost);
    }

    return {
      llm: this.computeStatsFromArray(llmCosts),
      embedding: this.computeStatsFromArray(embeddingCosts),
      total: this.computeStatsFromArray(totalCosts),
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
      if (log.totalTokens == null) continue;

      totalTokens.push(log.totalTokens);

      const breakdown = TokenMapBreakdownHelper.extractBreakdown(
        log.metrics?.tokenMap,
      );

      const llmTotal = breakdown.llmInput + breakdown.llmOutput;
      if (llmTotal > 0) {
        llmInputTokens.push(breakdown.llmInput);
        llmOutputTokens.push(breakdown.llmOutput);
        llmTotalTokens.push(llmTotal);
      }
      if (breakdown.embeddingTokens > 0) {
        embeddingTokens.push(breakdown.embeddingTokens);
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
