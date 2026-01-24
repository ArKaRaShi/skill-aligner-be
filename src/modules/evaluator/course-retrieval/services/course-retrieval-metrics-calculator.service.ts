import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import { NdcgCalculator } from '../helpers/ndcg-calculator.helper';
import { PrecisionCalculator } from '../helpers/precision-calculator.helper';
import type { LlmCourseEvaluationItem } from '../schemas/schema';
import type {
  CourseRetrievalIterationMetrics,
  EvaluationItem,
  PrecisionMetricWithContext,
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
      percentage: total > 0 ? DecimalHelper.divide(count * 100, total) : 0,
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

    // Calculate average relevance score using DecimalHelper for exact division
    const totalRelevance = evaluations.reduce(
      (sum, item) => sum + item.relevanceScore,
      0,
    );
    const averageRelevance = DecimalHelper.divide(totalRelevance, total);

    // Calculate score distribution
    const scoreDistribution = this.calculateDistribution(
      evaluations.map((e) => e.relevanceScore),
      total,
    );

    // Count highly relevant courses (score 3)
    const highlyRelevantCount = evaluations.filter(
      (e) => e.relevanceScore === 3,
    ).length;
    const highlyRelevantRate = DecimalHelper.divide(
      highlyRelevantCount * 100,
      total,
    );

    // Count irrelevant courses (score 0)
    const irrelevantCount = evaluations.filter(
      (e) => e.relevanceScore === 0,
    ).length;
    const irrelevantRate = DecimalHelper.divide(irrelevantCount * 100, total);

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

  /**
   * Calculate mean metrics across multiple samples (TREC-standard)
   *
   * This follows the TREC/standard IR evaluation approach where metrics
   * are calculated per-query (per-sample), then averaged across queries.
   * This is the CORRECT way to aggregate retrieval metrics.
   *
   * Each record contains per-sample metrics already calculated. This method
   * simply averages those metrics to produce the final aggregated values.
   *
   * @param records - Array of evaluation records with per-sample metrics
   * @returns Aggregated metrics (mean across all samples)
   */
  static calculateMeanMetrics(
    records: Array<{ metrics: RetrievalPerformanceMetrics }>,
  ): RetrievalPerformanceMetrics {
    if (records.length === 0) {
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

    // Sum all metric values across samples
    const sumMetrics = records.reduce(
      (acc, record) => ({
        totalCourses: acc.totalCourses + record.metrics.totalCourses,
        averageRelevance:
          acc.averageRelevance + record.metrics.averageRelevance,
        highlyRelevantCount:
          acc.highlyRelevantCount + record.metrics.highlyRelevantCount,
        highlyRelevantRate:
          acc.highlyRelevantRate + record.metrics.highlyRelevantRate,
        irrelevantCount: acc.irrelevantCount + record.metrics.irrelevantCount,
        irrelevantRate: acc.irrelevantRate + record.metrics.irrelevantRate,
        ndcgAt5: acc.ndcgAt5 + record.metrics.ndcg.at5,
        ndcgAt10: acc.ndcgAt10 + record.metrics.ndcg.at10,
        ndcgAtAll: acc.ndcgAtAll + record.metrics.ndcg.atAll,
        precisionAt5: acc.precisionAt5 + record.metrics.precision.at5,
        precisionAt10: acc.precisionAt10 + record.metrics.precision.at10,
        precisionAtAll: acc.precisionAtAll + record.metrics.precision.atAll,
      }),
      {
        totalCourses: 0,
        averageRelevance: 0,
        highlyRelevantCount: 0,
        highlyRelevantRate: 0,
        irrelevantCount: 0,
        irrelevantRate: 0,
        ndcgAt5: 0,
        ndcgAt10: 0,
        ndcgAtAll: 0,
        precisionAt5: 0,
        precisionAt10: 0,
        precisionAtAll: 0,
      },
    );

    const count = records.length;

    // Calculate combined score distribution (sum of counts, not averages)
    const combinedDistribution = this.calculateCombinedDistribution(records);

    return {
      totalCourses: sumMetrics.totalCourses,
      averageRelevance: DecimalHelper.divide(
        sumMetrics.averageRelevance,
        count,
      ),
      scoreDistribution: combinedDistribution,
      highlyRelevantCount: sumMetrics.highlyRelevantCount,
      highlyRelevantRate: DecimalHelper.divide(
        sumMetrics.highlyRelevantRate,
        count,
      ),
      irrelevantCount: sumMetrics.irrelevantCount,
      irrelevantRate: DecimalHelper.divide(sumMetrics.irrelevantRate, count),
      ndcg: {
        at5: DecimalHelper.divide(sumMetrics.ndcgAt5, count),
        at10: DecimalHelper.divide(sumMetrics.ndcgAt10, count),
        atAll: DecimalHelper.divide(sumMetrics.ndcgAtAll, count),
      },
      precision: {
        at5: DecimalHelper.divide(sumMetrics.precisionAt5, count),
        at10: DecimalHelper.divide(sumMetrics.precisionAt10, count),
        atAll: DecimalHelper.divide(sumMetrics.precisionAtAll, count),
      },
    };
  }

  /**
   * Calculate combined score distribution across multiple samples
   *
   * Sums up the counts from each sample's distribution, then recalculates
   * percentages based on the total count across all samples.
   *
   * @param records - Array of evaluation records with per-sample metrics
   * @returns Combined score distribution
   */
  private static calculateCombinedDistribution(
    records: Array<{ metrics: RetrievalPerformanceMetrics }>,
  ): RetrievalScoreDistribution[] {
    // Initialize combined counts
    const combinedCounts = new Map<number, number>();
    for (let i = 0; i <= 3; i++) {
      combinedCounts.set(i, 0);
    }

    // Sum counts from all samples
    let totalCount = 0;
    for (const record of records) {
      for (const dist of record.metrics.scoreDistribution) {
        const currentCount = combinedCounts.get(dist.relevanceScore) || 0;
        combinedCounts.set(dist.relevanceScore, currentCount + dist.count);
        totalCount += dist.count;
      }
      // Only add to totalCount once per sample, not per distribution entry
      totalCount -= record.metrics.scoreDistribution.reduce(
        (sum, d) => sum + d.count,
        0,
      );
      totalCount += record.metrics.totalCourses;
    }

    // Recalculate totalCount correctly
    totalCount = records.reduce((sum, r) => sum + r.metrics.totalCourses, 0);

    // Convert to array format with percentages using DecimalHelper for exact division
    return Array.from(combinedCounts.entries()).map(([score, count]) => ({
      relevanceScore: score as 0 | 1 | 2 | 3,
      count,
      percentage:
        totalCount > 0 ? DecimalHelper.divide(count * 100, totalCount) : 0,
    }));
  }

  /**
   * Build enriched iteration metrics with descriptions
   *
   * Converts flat metrics into the enriched format with:
   * - Context (numerator/denominator)
   * - Human-readable descriptions
   * - Self-documenting structure
   *
   * Uses DecimalHelper for all rounding operations to ensure exact precision.
   *
   * @param metrics - Calculated metrics (from calculateMetrics or calculateMeanMetrics)
   * @param params - Additional context for building descriptions
   * @returns Enriched iteration metrics ready for saving
   */
  static buildEnrichedIterationMetrics(params: {
    metrics: RetrievalPerformanceMetrics;
    sampleCount: number;
    iterationNumber: number;
  }): CourseRetrievalIterationMetrics {
    const { metrics, sampleCount, iterationNumber } = params;

    // Calculate total relevance sum for average relevance context
    const totalRelevanceSum = DecimalHelper.multiply(
      metrics.averageRelevance,
      metrics.totalCourses,
    );

    // Build enriched metrics using DecimalHelper for precision
    return {
      iteration: iterationNumber,
      timestamp: new Date().toISOString(),
      sampleCount,
      totalCoursesEvaluated: metrics.totalCourses,

      // === RELEVANCE METRICS ===
      averageRelevance: {
        value: DecimalHelper.roundScore(metrics.averageRelevance),
        totalRelevanceSum: DecimalHelper.roundScore(totalRelevanceSum),
        totalCourses: metrics.totalCourses,
        description: `Mean relevance: ${DecimalHelper.roundScore(metrics.averageRelevance)}/3 across ${metrics.totalCourses} courses`,
      },

      highlyRelevantRate: {
        value: DecimalHelper.roundRate(metrics.highlyRelevantRate),
        count: metrics.highlyRelevantCount,
        totalCount: metrics.totalCourses,
        description: `${metrics.highlyRelevantCount} of ${metrics.totalCourses} courses (${metrics.highlyRelevantRate.toFixed(1)}%) are highly relevant`,
      },

      irrelevantRate: {
        value: DecimalHelper.roundRate(metrics.irrelevantRate),
        count: metrics.irrelevantCount,
        totalCount: metrics.totalCourses,
        description: `${metrics.irrelevantCount} of ${metrics.totalCourses} courses (${metrics.irrelevantRate.toFixed(1)}%) are irrelevant`,
      },

      // === RANKING QUALITY METRICS (NDCG) ===
      ndcg: {
        at5: {
          value: DecimalHelper.roundAverage(metrics.ndcg.at5),
          description: this.getNdcgDescription(
            metrics.ndcg.at5,
            5,
            sampleCount,
          ),
        },
        at10: {
          value: DecimalHelper.roundAverage(metrics.ndcg.at10),
          description: this.getNdcgDescription(
            metrics.ndcg.at10,
            10,
            sampleCount,
          ),
        },
        atAll: {
          value: DecimalHelper.roundAverage(metrics.ndcg.atAll),
          description: this.getNdcgDescription(
            metrics.ndcg.atAll,
            metrics.totalCourses,
            sampleCount,
          ),
        },
      },

      // === PRECISION METRICS ===
      precision: {
        at5: this.buildPrecisionMetricWithContext(
          metrics.precision.at5,
          5,
          sampleCount,
          metrics.totalCourses,
        ),
        at10: this.buildPrecisionMetricWithContext(
          metrics.precision.at10,
          10,
          sampleCount,
          metrics.totalCourses,
        ),
        atAll: this.buildPrecisionMetricWithContext(
          metrics.precision.atAll,
          metrics.totalCourses,
          sampleCount,
          metrics.totalCourses,
        ),
      },
    };
  }

  /**
   * Generate human-readable NDCG description
   */
  private static getNdcgDescription(
    value: number,
    k: number,
    sampleCount: number,
  ): string {
    const rounded = DecimalHelper.roundAverage(value);
    const quality = this.getQualityRating(value);

    if (k > 100) {
      return `Mean NDCG@All: ${rounded} - ${quality} overall ranking across ${sampleCount} samples`;
    }

    return `Mean NDCG@${k}: ${rounded} - Top-${k} results show ${quality.toLowerCase()} ranking (${sampleCount} samples)`;
  }

  /**
   * Build precision metric with context
   */
  private static buildPrecisionMetricWithContext(
    value: number,
    k: number,
    sampleCount: number,
    totalCourses: number,
  ): PrecisionMetricWithContext {
    // Calculate approximate relevant count (value * total)
    const relevantCount = Math.round(
      value * Math.min(k, totalCourses) * sampleCount,
    );
    const totalCount = Math.min(k, totalCourses) * sampleCount;
    const roundedValue = DecimalHelper.roundAverage(value);
    // Format precision as percentage with 1 decimal place (consistency with rate display)
    const fmtPct = (v: number) => (v * 100).toFixed(1);

    // For @All (very large k), use different description
    if (k >= totalCourses) {
      return {
        value: roundedValue,
        relevantCount: Math.round(value * totalCourses),
        totalCount: totalCourses,
        description: `Mean precision: ${fmtPct(value)}% across all retrieved courses`,
      };
    }

    return {
      value: roundedValue,
      relevantCount,
      totalCount,
      description: `Mean Precision@${k}: ${fmtPct(value)}% - On average, ${fmtPct(value)}% of top-${k} courses are relevant (${sampleCount} samples)`,
    };
  }

  /**
   * Get quality rating for NDCG value
   */
  private static getQualityRating(value: number): string {
    if (value >= 0.9) return 'Excellent';
    if (value >= 0.8) return 'Good';
    if (value >= 0.7) return 'Reasonable';
    if (value >= 0.6) return 'Fair';
    if (value >= 0.5) return 'Poor';
    return 'Very Poor';
  }
}
