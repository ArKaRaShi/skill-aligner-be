import type { PerRunCostSummary } from '../types/query-analytics.type';
import type { QueryProcessLog } from '../types/query-log.type';
import { TokenMapBreakdownHelper } from './token-map-breakdown.helper';

/**
 * Per-Run Cost Summarizer Helper
 *
 * Static helper for transforming QueryProcessLog into PerRunCostSummary.
 * All methods are static - no instantiation needed.
 *
 * @example
 * ```ts
 * import { PerRunCostSummarizerHelper } from '../helpers/per-run-cost-summarizer.helper';
 *
 * const logs = await repository.findManyWithMetrics();
 * const summaries = logs
 *   .filter(log => log.totalCost != null)
 *   .map(log => PerRunCostSummarizerHelper.toSummary(log));
 * ```
 */
export class PerRunCostSummarizerHelper {
  /**
   * Transform a single QueryProcessLog to PerRunCostSummary.
   *
   * @param log - The query log to transform
   * @returns Per-run cost summary with LLM vs embedding breakdown
   */
  static toSummary(log: QueryProcessLog): PerRunCostSummary {
    const breakdown = TokenMapBreakdownHelper.extractBreakdown(
      log.metrics?.tokenMap,
    );

    return {
      logId: log.id,
      question: log.question,
      status: log.status,
      completedAt: log.completedAt ?? log.startedAt,
      costs: {
        llm: breakdown.llmCost || undefined,
        embedding: breakdown.embeddingCost || undefined,
        total: log.totalCost!,
      },
      tokens: {
        llm: {
          input: breakdown.llmInput,
          output: breakdown.llmOutput,
          total: breakdown.llmInput + breakdown.llmOutput,
        },
        embedding: { total: breakdown.embeddingTokens },
        total: log.totalTokens ?? 0,
      },
      duration: log.totalDuration ?? undefined,
    };
  }

  /**
   * Transform an array of QueryProcessLog to PerRunCostSummary.
   *
   * @param logs - Array of query logs to transform
   * @returns Array of per-run cost summaries (only logs with totalCost)
   */
  static toSummaryArray(logs: QueryProcessLog[]): PerRunCostSummary[] {
    return logs
      .filter((log) => log.totalCost != null)
      .map((log) => PerRunCostSummarizerHelper.toSummary(log));
  }
}
