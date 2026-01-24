import { DecimalHelper } from 'src/shared/utils/decimal.helper';

/**
 * Precision@K Calculator
 *
 * Calculates precision at various cut-off positions using LLM judge scores
 * as a proxy for relevance. No ground truth labels required.
 *
 * **Important**: These are proxy metrics using LLM judge scores.
 * "Relevant" is defined as score ≥ 2 (fairly or highly relevant).
 *
 * Formula:
 *   Precision@K = (count of scores ≥ 2 in top K) / K
 *
 * This measures: "Of the top K retrieved courses, how many are relevant?"
 */
export class PrecisionCalculator {
  /**
   * Calculate Precision@K
   *
   * @param relevanceScores - Array of relevance scores in ranked order (0-3)
   * @param k - Cut-off position
   * @param relevantThreshold - Minimum score to be considered "relevant" (default: 2)
   * @returns Precision score (0-1)
   */
  static calculatePrecisionAtK(
    relevanceScores: number[],
    k: number,
    relevantThreshold: number = 2,
  ): number {
    if (k <= 0 || relevanceScores.length === 0) {
      return 0;
    }

    const topKScores = relevanceScores.slice(0, k);
    const relevantCount = topKScores.filter(
      (score) => score >= relevantThreshold,
    ).length;

    // Divide by actual number of items, not k (handles k > array length)
    const actualK = topKScores.length;
    const precision = DecimalHelper.divide(relevantCount, actualK);
    return DecimalHelper.roundRate(precision);
  }

  /**
   * Calculate Precision at multiple cut-off positions
   *
   * Common values: Precision@5, Precision@10
   *
   * @param relevanceScores - Array of relevance scores in ranked order
   * @param kValues - Array of cut-off positions
   * @param relevantThreshold - Minimum score to be considered "relevant"
   * @returns Map of k → Precision@k
   */
  static calculatePrecisionAtMultipleK(
    relevanceScores: number[],
    kValues: number[],
    relevantThreshold: number = 2,
  ): Map<number, number> {
    const results = new Map<number, number>();

    for (const k of kValues) {
      results.set(
        k,
        this.calculatePrecisionAtK(relevanceScores, k, relevantThreshold),
      );
    }

    return results;
  }
}
