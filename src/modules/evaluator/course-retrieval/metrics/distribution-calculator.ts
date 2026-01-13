import { RetrievalScoreDistribution } from '../types/course-retrieval.types';

/**
 * Distribution Calculator
 *
 * Calculates score distributions for relevance metrics.
 * Focuses on distribution analysis: frequency counts and percentages.
 */
export class DistributionCalculator {
  /**
   * Calculates score distribution from a list of scores
   *
   * @param scores - Array of relevance scores
   * @param total - Total number of items
   * @returns Score distribution with counts and percentages
   */
  static calculateDistribution(
    scores: number[],
    total: number,
  ): RetrievalScoreDistribution[] {
    const distribution = new Map<number, number>();

    for (const score of scores) {
      distribution.set(score, (distribution.get(score) ?? 0) + 1);
    }

    return Array.from(distribution.entries()).map(([score, count]) => ({
      relevanceScore: score as 0 | 1 | 2 | 3,
      count,
      percentage: (count / total) * 100,
    }));
  }
}
