import { NdcgCalculator } from '../helpers/ndcg-calculator.helper';
import { PrecisionCalculator } from '../helpers/precision-calculator.helper';
import type { LlmCourseEvaluationItem } from '../schemas/schema';
import type {
  EvaluationItem,
  RetrievalPerformanceMetrics,
  RetrievalScoreDistribution,
} from '../types/course-retrieval.types';

/**
 * Metrics Calculator for Course Retrieval Evaluation
 *
 * Simplified metrics calculator following the modern evaluator pattern.
 * Uses single-score relevance model (commit e9cfa11) instead of the
 * legacy two-dimensional skill+context model.
 *
 * **Proxy Metrics**: NDCG and Precision use LLM judge scores as relevance.
 * Without ground truth, IDCG is calculated from the ideal ranking of the
 * judge's own scores, not from perfect ground truth.
 *
 * Follows the pattern from course-relevance-filter/metrics-calculator.service.ts
 */
export class CourseRetrievalMetricsCalculator {
  /**
   * Maps LLM evaluation items to internal evaluation items
   *
   * Transforms the LLM output format to the internal evaluation format
   * with proper field mapping (snake_case to camelCase).
   *
   * @param llmEvaluations - LLM course evaluation items
   * @param courses - Original course info for subjectCode/subjectName mapping
   * @returns Mapped evaluation items
   */
  static mapEvaluations(
    llmEvaluations: LlmCourseEvaluationItem[],
    courses: Array<{ subjectCode: string; subjectName: string }>,
  ): EvaluationItem[] {
    // Create a lookup map for course names by code
    const courseMap = new Map(
      courses.map((c) => [c.subjectCode, c.subjectName]),
    );

    return llmEvaluations.map((evalItem) => ({
      subjectCode: evalItem.code,
      subjectName: courseMap.get(evalItem.code) || evalItem.code, // Fallback to code if name not found
      relevanceScore: evalItem.score,
      reason: evalItem.reason,
    }));
  }

  /**
   * Calculate score distribution from scores
   *
   * @param scores - Array of relevance scores
   * @param total - Total number of items
   * @returns Score distribution array
   */
  private static calculateDistribution(
    scores: number[],
    total: number,
  ): RetrievalScoreDistribution[] {
    // Initialize distribution for all possible scores (0-3)
    const distribution = new Map<number, number>();
    for (let i = 0; i <= 3; i++) {
      distribution.set(i, 0);
    }

    // Count occurrences of each score
    for (const score of scores) {
      distribution.set(score, (distribution.get(score) || 0) + 1);
    }

    // Convert to array format with percentages
    return Array.from(distribution.entries()).map(([score, count]) => ({
      relevanceScore: score as 0 | 1 | 2 | 3,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  /**
   * Calculate metrics from evaluation items
   *
   * Computes simple flat metrics:
   * - Total courses evaluated
   * - Average relevance score
   * - Score distribution (0-3 breakdown)
   * - Highly relevant count/rate (score 3)
   * - Irrelevant count/rate (score 0)
   *
   * @param evaluations - List of evaluation items
   * @returns Retrieval performance metrics
   */
  static calculateMetrics(
    evaluations: EvaluationItem[],
  ): RetrievalPerformanceMetrics {
    const total = evaluations.length;

    // Handle empty state to avoid NaN
    if (total === 0) {
      return {
        totalCourses: 0,
        averageRelevance: 0,
        scoreDistribution: [
          { relevanceScore: 0, count: 0, percentage: 0 },
          { relevanceScore: 1, count: 0, percentage: 0 },
          { relevanceScore: 2, count: 0, percentage: 0 },
          { relevanceScore: 3, count: 0, percentage: 0 },
        ],
        highlyRelevantCount: 0,
        highlyRelevantRate: 0,
        irrelevantCount: 0,
        irrelevantRate: 0,
        ndcg: { at5: 0, at10: 0, atAll: 0 },
        precision: { at5: 0, at10: 0, atAll: 0 },
      };
    }

    // Calculate average relevance score
    const totalRelevance = evaluations.reduce(
      (sum, item) => sum + item.relevanceScore,
      0,
    );
    const averageRelevance = totalRelevance / total;

    // Calculate score distribution
    const scoreDistribution = this.calculateDistribution(
      evaluations.map((e) => e.relevanceScore),
      total,
    );

    // Count highly relevant courses (score 3)
    const highlyRelevantCount = evaluations.filter(
      (e) => e.relevanceScore === 3,
    ).length;
    const highlyRelevantRate = (highlyRelevantCount / total) * 100;

    // Count irrelevant courses (score 0)
    const irrelevantCount = evaluations.filter(
      (e) => e.relevanceScore === 0,
    ).length;
    const irrelevantRate = (irrelevantCount / total) * 100;

    // Extract relevance scores for NDCG and Precision calculations
    const relevanceScores = evaluations.map((e) => e.relevanceScore);

    // Calculate NDCG metrics (proxy: uses judge scores, no ground truth)
    const ndcgAt5 = NdcgCalculator.calculateNDCG(relevanceScores, 5);
    const ndcgAt10 = NdcgCalculator.calculateNDCG(relevanceScores, 10);
    const ndcgAtAll = NdcgCalculator.calculateNDCG(relevanceScores, total);

    // Calculate Precision@K metrics (proxy: score ≥ 2 = relevant)
    const precisionAt5 = PrecisionCalculator.calculatePrecisionAtK(
      relevanceScores,
      5,
    );
    const precisionAt10 = PrecisionCalculator.calculatePrecisionAtK(
      relevanceScores,
      10,
    );
    const precisionAtAll = PrecisionCalculator.calculatePrecisionAtK(
      relevanceScores,
      total,
    );

    return {
      totalCourses: total,
      averageRelevance,
      scoreDistribution,
      highlyRelevantCount,
      highlyRelevantRate,
      irrelevantCount,
      irrelevantRate,
      ndcg: {
        at5: ndcgAt5,
        at10: ndcgAt10,
        atAll: ndcgAtAll,
      },
      precision: {
        at5: precisionAt5,
        at10: precisionAt10,
        atAll: precisionAtAll,
      },
    };
  }
}
