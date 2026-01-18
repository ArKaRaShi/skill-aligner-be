import {
  TokenLogger,
  type TokenMap,
} from 'src/shared/utils/token-logger.helper';

import { PIPELINE_STEPS } from 'src/modules/query-processor/configs/pipeline-steps.config';

/**
 * Token Map Breakdown Helper
 *
 * Static helper for parsing TokenMap and extracting LLM vs embedding breakdown.
 * All methods are static - no instantiation needed.
 *
 * @example
 * ```ts
 * import { TokenMapBreakdownHelper } from '../helpers/token-map-breakdown.helper';
 *
 * const breakdown = TokenMapBreakdownHelper.extractBreakdown(log.metrics?.tokenMap);
 * console.log(breakdown.llmCost);      // LLM-only costs
 * console.log(breakdown.embeddingCost); // Embedding-only costs
 * ```
 */
export class TokenMapBreakdownHelper {
  private static readonly EMBEDDING_STEP_KEY =
    PIPELINE_STEPS.COURSE_RETRIEVAL.TOKEN_KEY;

  /**
   * Extract LLM vs embedding breakdown from TokenMap.
   *
   * @param tokenMap - The TokenMap from query log metrics
   * @returns Breakdown with costs and tokens separated by type
   */
  static extractBreakdown(tokenMap: TokenMap | undefined): {
    llmCost: number;
    embeddingCost: number;
    llmInput: number;
    llmOutput: number;
    embeddingTokens: number;
  } {
    if (!tokenMap) {
      return {
        llmCost: 0,
        embeddingCost: 0,
        llmInput: 0,
        llmOutput: 0,
        embeddingTokens: 0,
      };
    }

    const summary = new TokenLogger().getSummary(tokenMap);
    const breakdown = {
      llmCost: 0,
      embeddingCost: 0,
      llmInput: 0,
      llmOutput: 0,
      embeddingTokens: 0,
    };

    for (const [categoryKey, categoryData] of Object.entries(
      summary.byCategory,
    )) {
      if (categoryKey === TokenMapBreakdownHelper.EMBEDDING_STEP_KEY) {
        // Embedding step
        breakdown.embeddingCost += categoryData.cost;
        breakdown.embeddingTokens += categoryData.tokenCount.inputTokens;
      } else {
        // LLM steps
        breakdown.llmCost += categoryData.cost;
        breakdown.llmInput += categoryData.tokenCount.inputTokens;
        breakdown.llmOutput += categoryData.tokenCount.outputTokens;
      }
    }

    return breakdown;
  }
}
