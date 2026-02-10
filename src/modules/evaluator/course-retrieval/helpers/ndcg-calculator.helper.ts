import { DecimalHelper } from 'src/shared/utils/decimal.helper';

/**
 * NDCG (Normalized Discounted Cumulative Gain) Calculator
 *
 * Standard information retrieval metric for measuring ranking quality.
 * Uses graded relevance scores (0-3) without requiring ground truth labels.
 *
 * **Two NDCG Variants**:
 *
 * 1. **Proxy NDCG**: Uses actual scores sorted as ideal
 *    - IDCG = DCG of scores sorted descending
 *    - Measures: "How well did we rank the courses we retrieved?"
 *    - Use case: Isolate ranking quality from retrieval quality
 *    - Standard in: LLM judge evaluation
 *
 * 2. **Ideal NDCG**: Uses all perfect scores (3, 3, 3, ...) as ideal
 *    - IDCG = DCG of all perfect scores
 *    - Measures: "How close are we to perfect results?"
 *    - Use case: End-to-end system quality evaluation
 *    - See /docs/ndcg-metrics-approach.md for details
 *
 * Formula:
 *   DCG@k = Σ (relevance_i / log₂(i + 2))
 *   Proxy NDCG@k = DCG@k / DCG(sorted scores)
 *   Ideal NDCG@k = DCG@k / DCG(all 3s)
 *
 * @see https://en.wikipedia.org/wiki/Discounted_cumulative_gain
 */
export class NdcgCalculator {
  /**
   * Calculate DCG (Discounted Cumulative Gain)
   *
   * @param relevanceScores - Array of relevance scores in ranked order (0-3)
   * @param k - Cut-off position (default: all results)
   * @returns DCG score
   */
  static calculateDCG(
    relevanceScores: number[],
    k: number = relevanceScores.length,
  ): number {
    const truncatedScores = relevanceScores.slice(0, k);

    const dcg = truncatedScores.reduce((sum, relevance, index) => {
      // discount = log₂(position + 1) = log₂(index + 2)
      const discount = Math.log2(index + 2);
      return DecimalHelper.sum(sum, relevance / discount);
    }, 0);

    return DecimalHelper.roundScore(dcg);
  }

  /**
   * Calculate IDCG (Ideal DCG) - Proxy variant
   *
   * Ideal ranking = scores sorted in descending order.
   * This is a proxy: ideal is based on judge scores, not ground truth.
   *
   * @param relevanceScores - Array of relevance scores
   * @param k - Cut-off position
   * @returns IDCG score (perfect ranking according to judge)
   */
  static calculateIDCG(
    relevanceScores: number[],
    k: number = relevanceScores.length,
  ): number {
    // Sort scores descending for ideal ranking
    const idealScores = [...relevanceScores].sort((a, b) => b - a);
    return this.calculateDCG(idealScores, k);
  }

  /**
   * Calculate Ideal IDCG - All perfect scores variant
   *
   * Ideal ranking = all scores are perfect (3, 3, 3, ...)
   * This represents perfect ground truth.
   *
   * @param k - Cut-off position
   * @returns IDCG score (perfect ground truth)
   */
  static calculateIdealIDCG(k: number): number {
    // All perfect scores (3s)
    const perfectScores = Array(k).fill(3);
    return this.calculateDCG(perfectScores, k);
  }

  /**
   * Calculate Proxy NDCG@k
   *
   * Uses actual scores sorted as ideal (standard proxy approach).
   *
   * @param relevanceScores - Array of relevance scores in ranked order
   * @param k - Cut-off position (default: all results)
   * @returns NDCG score (0-1, where 1 = perfect ranking according to judge)
   */
  static calculateProxyNDCG(
    relevanceScores: number[],
    k: number = relevanceScores.length,
  ): number {
    const dcg = this.calculateDCG(relevanceScores, k);
    const idcg = this.calculateIDCG(relevanceScores, k);

    if (idcg === 0) {
      return 0; // Avoid division by zero (all irrelevant)
    }

    const ndcg = DecimalHelper.divide(dcg, idcg);
    return DecimalHelper.roundScore(ndcg);
  }

  /**
   * Calculate Ideal NDCG@k
   *
   * Uses all perfect scores (3, 3, 3, ...) as ideal.
   *
   * @param relevanceScores - Array of relevance scores in ranked order
   * @param k - Cut-off position (default: all results)
   * @returns NDCG score (0-1, where 1 = all results are perfect and perfectly ranked)
   */
  static calculateIdealNDCG(
    relevanceScores: number[],
    k: number = relevanceScores.length,
  ): number {
    const dcg = this.calculateDCG(relevanceScores, k);
    const idcg = this.calculateIdealIDCG(k);

    if (idcg === 0) {
      return 0; // Should not happen with k > 0 and perfect scores = 3
    }

    const ndcg = DecimalHelper.divide(dcg, idcg);
    return DecimalHelper.roundScore(ndcg);
  }

  /**
   * Calculate both Proxy and Ideal NDCG@k
   *
   * Returns both metrics in a single call for efficiency.
   *
   * @param relevanceScores - Array of relevance scores in ranked order
   * @param k - Cut-off position
   * @returns Object with both proxy and ideal NDCG scores
   */
  static calculateBothNDCG(
    relevanceScores: number[],
    k: number = relevanceScores.length,
  ): { proxy: number; ideal: number } {
    return {
      proxy: this.calculateProxyNDCG(relevanceScores, k),
      ideal: this.calculateIdealNDCG(relevanceScores, k),
    };
  }

  /**
   * Calculate NDCG@k (legacy method - now returns proxy)
   *
   * @deprecated Use calculateProxyNDCG or calculateBothNDCG instead
   * @param relevanceScores - Array of relevance scores in ranked order
   * @param k - Cut-off position (default: all results)
   * @returns NDCG score (0-1, proxy variant)
   */
  static calculateNDCG(
    relevanceScores: number[],
    k: number = relevanceScores.length,
  ): number {
    return this.calculateProxyNDCG(relevanceScores, k);
  }

  /**
   * Calculate NDCG at multiple cut-off positions
   *
   * Common values: NDCG@5, NDCG@10
   *
   * @param relevanceScores - Array of relevance scores in ranked order
   * @param kValues - Array of cut-off positions
   * @returns Map of k → NDCG@k (proxy variant)
   */
  static calculateNDCGAtK(
    relevanceScores: number[],
    kValues: number[],
  ): Map<number, number> {
    const results = new Map<number, number>();

    for (const k of kValues) {
      results.set(k, this.calculateProxyNDCG(relevanceScores, k));
    }

    return results;
  }
}
