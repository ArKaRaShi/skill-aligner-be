import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import type { MultiThresholdPrecisionValue } from '../types/course-retrieval.types';

/**
 * Precision@K Calculator
 *
 * Calculates precision at various cut-off positions using LLM judge scores
 * as a proxy for relevance. No ground truth labels required.
 *
 * **Multi-Threshold Support**: Now calculates precision at three relevance levels:
 * - Threshold 1 (lenient): Score ≥ 1 - "At least slightly relevant"
 * - Threshold 2 (standard): Score ≥ 2 - "Fairly or highly relevant" ← PRIMARY METRIC
 * - Threshold 3 (strict): Score ≥ 3 - "Highly relevant only"
 *
 * Formula:
 *   Precision@K (at threshold T) = (count of scores ≥ T in top K) / K
 *
 * This measures: "Of the top K retrieved courses, how many are relevant?"
 */
export class PrecisionCalculator {
  /**
   * Calculate Precision@K at a single threshold
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
   * Calculate multi-threshold precision at a single cut-off position
   *
   * Returns precision at all three thresholds (≥1, ≥2, ≥3) for a single K.
   *
   * @param relevanceScores - Array of relevance scores in ranked order (0-3)
   * @param k - Cut-off position
   * @returns Multi-threshold precision value
   */
  static calculateMultiThresholdPrecisionAtK(
    relevanceScores: number[],
    k: number,
  ): MultiThresholdPrecisionValue {
    if (k <= 0 || relevanceScores.length === 0) {
      return {
        threshold1: 0,
        threshold2: 0,
        threshold3: 0,
      };
    }

    return {
      threshold1: this.calculatePrecisionAtK(relevanceScores, k, 1), // Lenient
      threshold2: this.calculatePrecisionAtK(relevanceScores, k, 2), // Standard
      threshold3: this.calculatePrecisionAtK(relevanceScores, k, 3), // Strict
    };
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
