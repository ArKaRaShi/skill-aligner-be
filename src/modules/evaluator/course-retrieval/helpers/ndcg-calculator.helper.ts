import { DecimalHelper } from 'src/shared/utils/decimal.helper';

/**
 * NDCG (Normalized Discounted Cumulative Gain) Calculator
 *
 * Standard information retrieval metric for measuring ranking quality.
 * Uses graded relevance scores (0-3) without requiring ground truth labels.
 *
 * **Important**: These are proxy metrics using LLM judge scores as relevance.
 * Without ground truth, IDCG is calculated from the ideal ranking of the
 * judge's own scores (sorted descending), not from perfect ground truth.
 *
 * Formula:
 *   DCG@k = Σ (relevance_i / log₂(i + 2))
 *   IDCG@k = DCG of scores sorted descending
 *   NDCG@k = DCG@k / IDCG@k
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
   * Calculate IDCG (Ideal DCG)
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
   * Calculate NDCG@k
   *
   * @param relevanceScores - Array of relevance scores in ranked order
   * @param k - Cut-off position (default: all results)
   * @returns NDCG score (0-1, where 1 = perfect ranking according to judge)
   */
  static calculateNDCG(
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
   * Calculate NDCG at multiple cut-off positions
   *
   * Common values: NDCG@5, NDCG@10
   *
   * @param relevanceScores - Array of relevance scores in ranked order
   * @param kValues - Array of cut-off positions
   * @returns Map of k → NDCG@k
   */
  static calculateNDCGAtK(
    relevanceScores: number[],
    kValues: number[],
  ): Map<number, number> {
    const results = new Map<number, number>();

    for (const k of kValues) {
      results.set(k, this.calculateNDCG(relevanceScores, k));
    }

    return results;
  }
}
