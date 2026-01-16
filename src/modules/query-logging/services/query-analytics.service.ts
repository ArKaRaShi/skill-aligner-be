import { Logger } from '@nestjs/common';

import { TokenLogger, TokenMap } from 'src/shared/utils/token-logger.helper';

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
import type { QueryProcessLog } from '../types/query-log.type';
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
   * Computes costs/tokens from raw tokenMap data.
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

    const tokenLogger = new TokenLogger();
    const embeddingStepKey = 'step3-course-retrieval';

    return logs
      .filter((log) => Boolean(log.metrics?.tokenMap))
      .map((log) => {
        const tokenMap = log.metrics!.tokenMap as TokenMap;
        const summary = tokenLogger.getSummary(tokenMap);

        // Separate LLM vs embedding
        let llmCost = 0;
        let embeddingCost = 0;
        let llmInput = 0;
        let llmOutput = 0;
        let embeddingTotal = 0;

        for (const [categoryKey, categoryData] of Object.entries(
          summary.byCategory,
        )) {
          if (categoryKey === embeddingStepKey) {
            embeddingCost += categoryData.cost;
            embeddingTotal += categoryData.tokenCount.inputTokens;
          } else {
            llmCost += categoryData.cost;
            llmInput += categoryData.tokenCount.inputTokens;
            llmOutput += categoryData.tokenCount.outputTokens;
          }
        }

        const timing = log.metrics!.timing;
        const duration = timing
          ? Object.values(timing).find((t) => t.duration)?.duration
          : undefined;

        return {
          logId: log.id,
          question: log.question,
          status: log.status,
          completedAt: log.completedAt ?? log.startedAt,
          costs: {
            llm: llmCost || undefined,
            embedding: embeddingCost || undefined,
            total: summary.totalCost ?? 0,
          },
          tokens: {
            llm: {
              input: llmInput,
              output: llmOutput,
              total: llmInput + llmOutput,
            },
            embedding: { total: embeddingTotal },
            total:
              (summary.totalTokens?.inputTokens ?? 0) +
              (summary.totalTokens?.outputTokens ?? 0),
          },
          duration,
        };
      });
  }

  /**
   * Compute cost breakdown statistics from an array of logs.
   * Extracts costs from raw tokenMap data using getSummary().
   *
   * @private
   */
  private computeCostBreakdownStats(
    logs: QueryProcessLog[],
  ): CostBreakdownStatistics {
    const tokenLogger = new TokenLogger();
    const embeddingStepKey = 'step3-course-retrieval';

    const llmCosts: number[] = [];
    const embeddingCosts: number[] = [];
    const totalCosts: number[] = [];

    for (const log of logs) {
      const tokenMap = log.metrics?.tokenMap as TokenMap | undefined;
      if (!tokenMap) continue;

      const summary = tokenLogger.getSummary(tokenMap);

      if (summary.totalCost != null) {
        totalCosts.push(summary.totalCost);

        // Separate LLM vs embedding costs
        let llmCost = 0;
        let embeddingCost = 0;

        for (const [categoryKey, categoryData] of Object.entries(
          summary.byCategory,
        )) {
          if (categoryKey === embeddingStepKey) {
            embeddingCost += categoryData.cost;
          } else {
            llmCost += categoryData.cost;
          }
        }

        if (llmCost > 0) llmCosts.push(llmCost);
        if (embeddingCost > 0) embeddingCosts.push(embeddingCost);
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
   * Extracts tokens from raw tokenMap data using getSummary().
   *
   * @private
   */
  private computeTokenBreakdownStats(
    logs: QueryProcessLog[],
  ): TokenBreakdownStatistics {
    const tokenLogger = new TokenLogger();
    const embeddingStepKey = 'step3-course-retrieval';

    const llmInputTokens: number[] = [];
    const llmOutputTokens: number[] = [];
    const llmTotalTokens: number[] = [];
    const embeddingTokens: number[] = [];
    const totalTokens: number[] = [];

    for (const log of logs) {
      const tokenMap = log.metrics?.tokenMap as TokenMap | undefined;
      if (!tokenMap) continue;

      const summary = tokenLogger.getSummary(tokenMap);

      if (summary.totalTokens != null) {
        totalTokens.push(
          summary.totalTokens.inputTokens + summary.totalTokens.outputTokens,
        );
      }

      // Separate LLM vs embedding tokens
      let llmInput = 0;
      let llmOutput = 0;
      let embeddingTotal = 0;

      for (const [categoryKey, categoryData] of Object.entries(
        summary.byCategory,
      )) {
        if (categoryKey === embeddingStepKey) {
          // Embedding only has input tokens
          embeddingTotal += categoryData.tokenCount.inputTokens;
        } else {
          // LLM has both input and output
          llmInput += categoryData.tokenCount.inputTokens;
          llmOutput += categoryData.tokenCount.outputTokens;
        }
      }

      if (llmInput > 0 || llmOutput > 0) {
        llmInputTokens.push(llmInput);
        llmOutputTokens.push(llmOutput);
        llmTotalTokens.push(llmInput + llmOutput);
      }
      if (embeddingTotal > 0) {
        embeddingTokens.push(embeddingTotal);
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
