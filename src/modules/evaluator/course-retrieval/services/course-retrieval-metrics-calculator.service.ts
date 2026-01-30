import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import { NdcgCalculator } from '../helpers/ndcg-calculator.helper';
import { PrecisionCalculator } from '../helpers/precision-calculator.helper';
import type { LlmCourseEvaluationItem } from '../schemas/schema';
import type {
  CourseRetrievalIterationMetrics,
  EvaluationItem,
  MultiThresholdPrecisionValue,
  PerClassDistribution,
  PerClassDistributionWithContext,
  PerClassRate,
  PerClassRateWithContext,
  PrecisionThresholdWithContext,
  RetrievalPerformanceMetrics,
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
  /** Threshold for considering macro and micro rates as equal (1%) */
  private static readonly RATE_EQUALITY_THRESHOLD = 0.01;
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
   * Calculate per-class distribution from scores
   *
   * @param scores - Array of relevance scores
   * @param total - Total number of items
   * @returns Per-class distribution with counts and rates
   */
  private static calculatePerClassDistribution(
    scores: number[],
    total: number,
  ): PerClassDistribution {
    // Initialize counts for all possible scores (0-3)
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };

    // Count occurrences of each score
    for (const score of scores) {
      counts[score as keyof typeof counts]++;
    }

    // Calculate rates (same for both macro and micro in single sample)
    const createRate = (
      score: 0 | 1 | 2 | 3,
      label: PerClassRate['label'],
    ): PerClassRate => ({
      relevanceScore: score,
      count: counts[score],
      macroAverageRate:
        total > 0 ? DecimalHelper.divide(counts[score] * 100, total) : 0,
      microAverageRate:
        total > 0 ? DecimalHelper.divide(counts[score] * 100, total) : 0,
      label,
    });

    return {
      score0: createRate(0, 'irrelevant'),
      score1: createRate(1, 'slightly_relevant'),
      score2: createRate(2, 'fairly_relevant'),
      score3: createRate(3, 'highly_relevant'),
    };
  }

  /**
   * Calculate metrics from evaluation items
   *
   * Computes simple flat metrics:
   * - Total courses evaluated
   * - Mean relevance score
   * - Per-class distribution (0-3 breakdown with macro and micro)
   * - NDCG metrics (ranking quality)
   * - Precision@K metrics (proxy: score ≥ 2 = relevant)
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
        meanRelevanceScore: 0,
        totalRelevanceSum: 0,
        perClassDistribution: {
          score0: {
            relevanceScore: 0,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'irrelevant',
          },
          score1: {
            relevanceScore: 1,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'slightly_relevant',
          },
          score2: {
            relevanceScore: 2,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'highly_relevant',
          },
        },
        ndcg: {
          proxy: { at5: 0, at10: 0, at15: 0, atAll: 0 },
          ideal: { at5: 0, at10: 0, at15: 0, atAll: 0 },
        },
        precision: {
          at5: { threshold1: 0, threshold2: 0, threshold3: 0 },
          at10: { threshold1: 0, threshold2: 0, threshold3: 0 },
          at15: { threshold1: 0, threshold2: 0, threshold3: 0 },
          atAll: { threshold1: 0, threshold2: 0, threshold3: 0 },
        },
      };
    }

    // Calculate mean relevance score using DecimalHelper for exact division
    const totalRelevance = evaluations.reduce(
      (sum, item) => sum + item.relevanceScore,
      0,
    );
    const meanRelevanceScore = DecimalHelper.divide(totalRelevance, total);

    // Calculate per-class distribution (macro = micro for single sample)
    const perClassDistribution = this.calculatePerClassDistribution(
      evaluations.map((e) => e.relevanceScore),
      total,
    );

    // Extract relevance scores for NDCG and Precision calculations
    const relevanceScores = evaluations.map((e) => e.relevanceScore);

    // Calculate NDCG metrics (both proxy and ideal variants)
    const ndcgProxyAt5 = NdcgCalculator.calculateProxyNDCG(relevanceScores, 5);
    const ndcgProxyAt10 = NdcgCalculator.calculateProxyNDCG(
      relevanceScores,
      10,
    );
    const ndcgProxyAt15 = NdcgCalculator.calculateProxyNDCG(
      relevanceScores,
      15,
    );
    const ndcgProxyAtAll = NdcgCalculator.calculateProxyNDCG(
      relevanceScores,
      total,
    );

    const ndcgIdealAt5 = NdcgCalculator.calculateIdealNDCG(relevanceScores, 5);
    const ndcgIdealAt10 = NdcgCalculator.calculateIdealNDCG(
      relevanceScores,
      10,
    );
    const ndcgIdealAt15 = NdcgCalculator.calculateIdealNDCG(
      relevanceScores,
      15,
    );
    const ndcgIdealAtAll = NdcgCalculator.calculateIdealNDCG(
      relevanceScores,
      total,
    );

    // Calculate Precision@K metrics with multi-threshold support
    const precisionAt5 =
      PrecisionCalculator.calculateMultiThresholdPrecisionAtK(
        relevanceScores,
        5,
      );
    const precisionAt10 =
      PrecisionCalculator.calculateMultiThresholdPrecisionAtK(
        relevanceScores,
        10,
      );
    const precisionAt15 =
      PrecisionCalculator.calculateMultiThresholdPrecisionAtK(
        relevanceScores,
        15,
      );
    const precisionAtAll =
      PrecisionCalculator.calculateMultiThresholdPrecisionAtK(
        relevanceScores,
        total,
      );

    return {
      totalCourses: total,
      meanRelevanceScore,
      totalRelevanceSum: totalRelevance,
      perClassDistribution,
      ndcg: {
        proxy: {
          at5: ndcgProxyAt5,
          at10: ndcgProxyAt10,
          at15: ndcgProxyAt15,
          atAll: ndcgProxyAtAll,
        },
        ideal: {
          at5: ndcgIdealAt5,
          at10: ndcgIdealAt10,
          at15: ndcgIdealAt15,
          atAll: ndcgIdealAtAll,
        },
      },
      precision: {
        at5: precisionAt5,
        at10: precisionAt10,
        at15: precisionAt15,
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
   * **Macro vs Micro Averages for Per-Class Distribution**:
   * - **Macro-average**: Average of per-sample rates for each score class
   * - **Micro-average**: Total count for each score class / total courses * 100
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
        meanRelevanceScore: 0,
        totalRelevanceSum: 0,
        perClassDistribution: {
          score0: {
            relevanceScore: 0,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'irrelevant',
          },
          score1: {
            relevanceScore: 1,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'slightly_relevant',
          },
          score2: {
            relevanceScore: 2,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'highly_relevant',
          },
        },
        ndcg: {
          proxy: { at5: 0, at10: 0, at15: 0, atAll: 0 },
          ideal: { at5: 0, at10: 0, at15: 0, atAll: 0 },
        },
        precision: {
          at5: { threshold1: 0, threshold2: 0, threshold3: 0 },
          at10: { threshold1: 0, threshold2: 0, threshold3: 0 },
          at15: { threshold1: 0, threshold2: 0, threshold3: 0 },
          atAll: { threshold1: 0, threshold2: 0, threshold3: 0 },
        },
      };
    }

    const count = records.length;

    // Sum all metric values across samples
    const sumMetrics = records.reduce(
      (acc, record) => ({
        totalCourses: acc.totalCourses + record.metrics.totalCourses,
        totalRelevanceSum:
          acc.totalRelevanceSum + record.metrics.totalRelevanceSum,
        meanRelevanceScore:
          acc.meanRelevanceScore + record.metrics.meanRelevanceScore,
        ndcgProxyAt5: acc.ndcgProxyAt5 + record.metrics.ndcg.proxy.at5,
        ndcgProxyAt10: acc.ndcgProxyAt10 + record.metrics.ndcg.proxy.at10,
        ndcgProxyAt15: acc.ndcgProxyAt15 + record.metrics.ndcg.proxy.at15,
        ndcgProxyAtAll: acc.ndcgProxyAtAll + record.metrics.ndcg.proxy.atAll,
        ndcgIdealAt5: acc.ndcgIdealAt5 + record.metrics.ndcg.ideal.at5,
        ndcgIdealAt10: acc.ndcgIdealAt10 + record.metrics.ndcg.ideal.at10,
        ndcgIdealAt15: acc.ndcgIdealAt15 + record.metrics.ndcg.ideal.at15,
        ndcgIdealAtAll: acc.ndcgIdealAtAll + record.metrics.ndcg.ideal.atAll,
        // Multi-threshold precision aggregation
        precisionAt5_threshold1:
          acc.precisionAt5_threshold1 + record.metrics.precision.at5.threshold1,
        precisionAt5_threshold2:
          acc.precisionAt5_threshold2 + record.metrics.precision.at5.threshold2,
        precisionAt5_threshold3:
          acc.precisionAt5_threshold3 + record.metrics.precision.at5.threshold3,
        precisionAt10_threshold1:
          acc.precisionAt10_threshold1 +
          record.metrics.precision.at10.threshold1,
        precisionAt10_threshold2:
          acc.precisionAt10_threshold2 +
          record.metrics.precision.at10.threshold2,
        precisionAt10_threshold3:
          acc.precisionAt10_threshold3 +
          record.metrics.precision.at10.threshold3,
        precisionAt15_threshold1:
          acc.precisionAt15_threshold1 +
          record.metrics.precision.at15.threshold1,
        precisionAt15_threshold2:
          acc.precisionAt15_threshold2 +
          record.metrics.precision.at15.threshold2,
        precisionAt15_threshold3:
          acc.precisionAt15_threshold3 +
          record.metrics.precision.at15.threshold3,
        precisionAtAll_threshold1:
          acc.precisionAtAll_threshold1 +
          record.metrics.precision.atAll.threshold1,
        precisionAtAll_threshold2:
          acc.precisionAtAll_threshold2 +
          record.metrics.precision.atAll.threshold2,
        precisionAtAll_threshold3:
          acc.precisionAtAll_threshold3 +
          record.metrics.precision.atAll.threshold3,
      }),
      {
        totalCourses: 0,
        totalRelevanceSum: 0,
        meanRelevanceScore: 0,
        ndcgProxyAt5: 0,
        ndcgProxyAt10: 0,
        ndcgProxyAt15: 0,
        ndcgProxyAtAll: 0,
        ndcgIdealAt5: 0,
        ndcgIdealAt10: 0,
        ndcgIdealAt15: 0,
        ndcgIdealAtAll: 0,
        precisionAt5_threshold1: 0,
        precisionAt5_threshold2: 0,
        precisionAt5_threshold3: 0,
        precisionAt10_threshold1: 0,
        precisionAt10_threshold2: 0,
        precisionAt10_threshold3: 0,
        precisionAt15_threshold1: 0,
        precisionAt15_threshold2: 0,
        precisionAt15_threshold3: 0,
        precisionAtAll_threshold1: 0,
        precisionAtAll_threshold2: 0,
        precisionAtAll_threshold3: 0,
      },
    );

    // Calculate per-class distribution with both macro and micro averages
    const perClassDistribution = this.calculateAggregatedPerClassDistribution(
      records,
      sumMetrics.totalCourses,
    );

    return {
      totalCourses: sumMetrics.totalCourses,
      meanRelevanceScore: DecimalHelper.divide(
        sumMetrics.meanRelevanceScore,
        count,
      ),
      totalRelevanceSum: sumMetrics.totalRelevanceSum,
      perClassDistribution,
      ndcg: {
        proxy: {
          at5: DecimalHelper.divide(sumMetrics.ndcgProxyAt5, count),
          at10: DecimalHelper.divide(sumMetrics.ndcgProxyAt10, count),
          at15: DecimalHelper.divide(sumMetrics.ndcgProxyAt15, count),
          atAll: DecimalHelper.divide(sumMetrics.ndcgProxyAtAll, count),
        },
        ideal: {
          at5: DecimalHelper.divide(sumMetrics.ndcgIdealAt5, count),
          at10: DecimalHelper.divide(sumMetrics.ndcgIdealAt10, count),
          at15: DecimalHelper.divide(sumMetrics.ndcgIdealAt15, count),
          atAll: DecimalHelper.divide(sumMetrics.ndcgIdealAtAll, count),
        },
      },
      precision: {
        at5: {
          threshold1: DecimalHelper.divide(
            sumMetrics.precisionAt5_threshold1,
            count,
          ),
          threshold2: DecimalHelper.divide(
            sumMetrics.precisionAt5_threshold2,
            count,
          ),
          threshold3: DecimalHelper.divide(
            sumMetrics.precisionAt5_threshold3,
            count,
          ),
        },
        at10: {
          threshold1: DecimalHelper.divide(
            sumMetrics.precisionAt10_threshold1,
            count,
          ),
          threshold2: DecimalHelper.divide(
            sumMetrics.precisionAt10_threshold2,
            count,
          ),
          threshold3: DecimalHelper.divide(
            sumMetrics.precisionAt10_threshold3,
            count,
          ),
        },
        at15: {
          threshold1: DecimalHelper.divide(
            sumMetrics.precisionAt15_threshold1,
            count,
          ),
          threshold2: DecimalHelper.divide(
            sumMetrics.precisionAt15_threshold2,
            count,
          ),
          threshold3: DecimalHelper.divide(
            sumMetrics.precisionAt15_threshold3,
            count,
          ),
        },
        atAll: {
          threshold1: DecimalHelper.divide(
            sumMetrics.precisionAtAll_threshold1,
            count,
          ),
          threshold2: DecimalHelper.divide(
            sumMetrics.precisionAtAll_threshold2,
            count,
          ),
          threshold3: DecimalHelper.divide(
            sumMetrics.precisionAtAll_threshold3,
            count,
          ),
        },
      },
    };
  }

  /**
   * Calculate aggregated per-class distribution across multiple samples
   *
   * Computes both macro and micro averages for each relevance score class:
   * - **Macro-average**: Average of per-sample rates (each sample weighted equally)
   * - **Micro-average**: Total count for each score / total courses * 100 (weighted by sample size)
   *
   * **IMPORTANT**: Micro rates are calculated using the ACTUAL sum of counts from
   * the distribution, not the totalCourses parameter. This ensures accuracy when
   * some courses may not have relevance scores assigned (e.g., null/undefined).
   *
   * @param records - Array of evaluation records with per-sample metrics
   * @param totalCourses - Total number of courses across all samples (for validation/logging)
   * @returns Aggregated per-class distribution with macro and micro averages
   */
  private static calculateAggregatedPerClassDistribution(
    records: Array<{ metrics: RetrievalPerformanceMetrics }>,
    totalCourses: number,
  ): PerClassDistribution {
    const count = records.length;

    // Initialize aggregators for each score class
    const aggregators = {
      0: { count: 0, macroRateSum: 0 },
      1: { count: 0, macroRateSum: 0 },
      2: { count: 0, macroRateSum: 0 },
      3: { count: 0, macroRateSum: 0 },
    };

    // Aggregate across all samples
    for (const record of records) {
      const dist = record.metrics.perClassDistribution;

      // Sum counts and macro rates for each score class
      aggregators[0].count += dist.score0.count;
      aggregators[0].macroRateSum += dist.score0.macroAverageRate;

      aggregators[1].count += dist.score1.count;
      aggregators[1].macroRateSum += dist.score1.macroAverageRate;

      aggregators[2].count += dist.score2.count;
      aggregators[2].macroRateSum += dist.score2.macroAverageRate;

      aggregators[3].count += dist.score3.count;
      aggregators[3].macroRateSum += dist.score3.macroAverageRate;
    }

    // Calculate the ACTUAL total from the aggregated counts
    // This is the correct denominator for micro rates
    const actualTotalCount =
      aggregators[0].count +
      aggregators[1].count +
      aggregators[2].count +
      aggregators[3].count;

    // Log validation: Check for count gap (courses without relevance scores)
    if (totalCourses > 0 && actualTotalCount !== totalCourses) {
      const gap = totalCourses - actualTotalCount;
      const gapPercentage = DecimalHelper.divide(gap * 100, totalCourses);
      console.warn(
        `[CourseRetrievalMetricsCalculator] Count gap detected in per-class distribution:\n` +
          `  - Total courses evaluated: ${totalCourses}\n` +
          `  - Sum of distribution counts: ${actualTotalCount}\n` +
          `  - Gap: ${gap} courses (${gapPercentage.toFixed(2)}%)\n` +
          `  - Possible causes: null/undefined relevance scores, missing evaluations, or filtering logic\n` +
          `  - Using actualTotalCount (${actualTotalCount}) as denominator for micro rates`,
      );
    }

    // Build final distribution with both macro and micro averages
    const createRate = (
      score: 0 | 1 | 2 | 3,
      label: PerClassRate['label'],
    ): PerClassRate => {
      const agg = aggregators[score];

      return {
        relevanceScore: score,
        count: agg.count,
        // Macro-average: average of per-sample rates
        macroAverageRate:
          count > 0 ? DecimalHelper.divide(agg.macroRateSum, count) : 0,
        // Micro-average: total count / actual total * 100
        // IMPORTANT: Use actualTotalCount (not totalCourses parameter) to ensure counts sum to 100%
        microAverageRate:
          actualTotalCount > 0
            ? DecimalHelper.divide(agg.count * 100, actualTotalCount)
            : 0,
        label,
      };
    };

    return {
      score0: createRate(0, 'irrelevant'),
      score1: createRate(1, 'slightly_relevant'),
      score2: createRate(2, 'fairly_relevant'),
      score3: createRate(3, 'highly_relevant'),
    };
  }

  /**
   * Build enriched iteration metrics with descriptions
   *
   * Converts flat metrics into the enriched format with:
   * - Context (numerator/denominator)
   * - Human-readable descriptions
   * - Self-documenting structure
   * - Per-class distribution with macro vs micro breakdown
   *
   * Uses DecimalHelper for all rounding operations to ensure exact precision.
   *
   * @param params - Metrics and context for building descriptions
   * @returns Enriched iteration metrics ready for saving
   */
  static buildEnrichedIterationMetrics(params: {
    metrics: RetrievalPerformanceMetrics;
    sampleCount: number;
    iterationNumber: number;
    skillDeduplicationStats?: import('../types/course-retrieval.types').SkillDeduplicationStats;
  }): CourseRetrievalIterationMetrics {
    const { metrics, sampleCount, iterationNumber, skillDeduplicationStats } =
      params;

    // Calculate macro and micro means
    // Macro: Average of per-sample means (TREC standard)
    const macroMean = metrics.meanRelevanceScore;
    // Micro: Total sum / total courses
    const microMean = DecimalHelper.divide(
      metrics.totalRelevanceSum,
      metrics.totalCourses,
    );

    // Calculate the actual total from the distribution counts
    // This is the number of courses that received relevance scores
    const actualTotalCount =
      metrics.perClassDistribution.score0.count +
      metrics.perClassDistribution.score1.count +
      metrics.perClassDistribution.score2.count +
      metrics.perClassDistribution.score3.count;

    // Calculate the gap: courses that were retrieved but not scored
    const coursesNotScored = Math.max(
      0,
      metrics.totalCourses - actualTotalCount,
    );

    // Build enriched per-class distribution with descriptions
    // The outOf in the enriched output is calculated from the distribution counts
    const perClassDistribution = this.buildEnrichedPerClassDistribution(
      metrics.perClassDistribution,
    );

    // Build enriched metrics using DecimalHelper for precision
    return {
      iteration: iterationNumber,
      timestamp: new Date().toISOString(),
      sampleCount,

      // === RETRIEVAL STATISTICS ===
      totalCoursesRetrieved: metrics.totalCourses,
      totalCoursesScored: actualTotalCount,
      coursesNotScored: coursesNotScored,

      skillDeduplicationStats: skillDeduplicationStats ?? {
        totalQuestions: 0,
        totalSkillsExtracted: 0,
        uniqueSkillsEvaluated: sampleCount,
        deduplicationRate: 0,
        skillFrequency: new Map(),
      },

      // === RELEVANCE METRICS ===
      meanRelevanceScore: {
        macroMean: DecimalHelper.roundScore(macroMean),
        microMean: DecimalHelper.roundScore(microMean),
        totalRelevanceSum: metrics.totalRelevanceSum,
        totalCourses: metrics.totalCourses,
        sampleCount,
        description: `Macro mean (TREC): ${DecimalHelper.roundScore(macroMean)}/3 (avg of ${sampleCount} samples) | Micro mean: ${DecimalHelper.roundScore(microMean)}/3 (${metrics.totalRelevanceSum}/${metrics.totalCourses} courses)`,
      },

      perClassDistribution,

      // === RANKING QUALITY METRICS (NDCG) ===
      ndcg: {
        at5: {
          proxyNdcg: DecimalHelper.roundAverage(metrics.ndcg.proxy.at5),
          idealNdcg: DecimalHelper.roundAverage(metrics.ndcg.ideal.at5),
          description: this.getNdcgDescription(
            metrics.ndcg.proxy.at5,
            metrics.ndcg.ideal.at5,
            5,
            sampleCount,
          ),
        },
        at10: {
          proxyNdcg: DecimalHelper.roundAverage(metrics.ndcg.proxy.at10),
          idealNdcg: DecimalHelper.roundAverage(metrics.ndcg.ideal.at10),
          description: this.getNdcgDescription(
            metrics.ndcg.proxy.at10,
            metrics.ndcg.ideal.at10,
            10,
            sampleCount,
          ),
        },
        at15: {
          proxyNdcg: DecimalHelper.roundAverage(metrics.ndcg.proxy.at15),
          idealNdcg: DecimalHelper.roundAverage(metrics.ndcg.ideal.at15),
          description: this.getNdcgDescription(
            metrics.ndcg.proxy.at15,
            metrics.ndcg.ideal.at15,
            15,
            sampleCount,
          ),
        },
        atAll: {
          proxyNdcg: DecimalHelper.roundAverage(metrics.ndcg.proxy.atAll),
          idealNdcg: DecimalHelper.roundAverage(metrics.ndcg.ideal.atAll),
          description: this.getNdcgDescription(
            metrics.ndcg.proxy.atAll,
            metrics.ndcg.ideal.atAll,
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
        at15: this.buildPrecisionMetricWithContext(
          metrics.precision.at15,
          15,
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
   * Build enriched per-class distribution with descriptions
   *
   * Adds human-readable descriptions showing macro vs micro differences
   * for each relevance score class.
   *
   * **IMPORTANT**: The totalCount field is calculated from the actual sum of
   * counts in the distribution. This ensures the counts sum to the reported totalCount.
   *
   * @param distribution - Per-class distribution
   * @returns Enriched per-class distribution with descriptions
   */
  private static buildEnrichedPerClassDistribution(
    distribution: PerClassDistribution,
  ): PerClassDistributionWithContext {
    // Calculate the ACTUAL total from the distribution counts
    // This is what the counts sum to, so it should be the reported totalCount
    const actualTotalCount =
      distribution.score0.count +
      distribution.score1.count +
      distribution.score2.count +
      distribution.score3.count;

    const buildEnrichedRate = (rate: PerClassRate): PerClassRateWithContext => {
      const macroRounded = rate.macroAverageRate.toFixed(1);
      const microRounded = rate.microAverageRate.toFixed(1);

      let description: string;
      if (
        Math.abs(rate.macroAverageRate - rate.microAverageRate) <
        CourseRetrievalMetricsCalculator.RATE_EQUALITY_THRESHOLD
      ) {
        // Macro and micro are the same
        description = `${rate.count} of ${actualTotalCount} courses (${macroRounded}%) are ${rate.label.replace('_', ' ')}`;
      } else {
        // Show both macro and micro
        description = `${rate.count} of ${actualTotalCount} courses are ${rate.label.replace('_', ' ')} - Macro: ${macroRounded}% (avg of sample rates), Micro: ${microRounded}% (from total counts)`;
      }

      return {
        relevanceScore: rate.relevanceScore,
        label: rate.label,
        count: rate.count,
        outOf: actualTotalCount, // Use actual sum, not passed totalCourses
        macroAverageRate: DecimalHelper.roundRate(rate.macroAverageRate),
        microAverageRate: DecimalHelper.roundRate(rate.microAverageRate),
        description,
      };
    };

    return {
      score0: buildEnrichedRate(distribution.score0),
      score1: buildEnrichedRate(distribution.score1),
      score2: buildEnrichedRate(distribution.score2),
      score3: buildEnrichedRate(distribution.score3),
    };
  }

  /**
   * Generate human-readable NDCG description
   */
  private static getNdcgDescription(
    proxyValue: number,
    idealValue: number,
    k: number,
    sampleCount: number,
  ): string {
    const proxyRounded = DecimalHelper.roundAverage(proxyValue);
    const idealRounded = DecimalHelper.roundAverage(idealValue);
    const proxyQuality = this.getQualityRating(proxyValue);
    const idealQuality = this.getQualityRating(idealValue);

    if (k > 100) {
      return `Mean NDCG@All - Proxy: ${proxyRounded} (${proxyQuality}), Ideal: ${idealRounded} (${idealQuality}) - Overall ranking across ${sampleCount} samples`;
    }

    return `Mean NDCG@${k} - Proxy: ${proxyRounded} (${proxyQuality}), Ideal: ${idealRounded} (${idealQuality}) - Top-${k} results (${sampleCount} samples)`;
  }

  /**
   * Build precision metric with context (multi-threshold version)
   *
   * Builds enriched context for all three thresholds (≥1, ≥2, ≥3) at a single cut-off position.
   *
   * @param value - Multi-threshold precision value (threshold1, threshold2, threshold3)
   * @param k - Cut-off position (5, 10, 15, or all)
   * @param sampleCount - Number of samples (records) in aggregation
   * @param totalCourses - Total number of courses (for @All case)
   * @returns Object with context for each threshold
   */
  private static buildPrecisionMetricWithContext(
    value: MultiThresholdPrecisionValue,
    k: number,
    sampleCount: number,
    totalCourses: number,
  ): {
    threshold1: PrecisionThresholdWithContext;
    threshold2: PrecisionThresholdWithContext;
    threshold3: PrecisionThresholdWithContext;
  } {
    // Format precision as percentage with 1 decimal place
    const fmtPct = (v: number) => (v * 100).toFixed(1);

    // Build context for a single threshold
    const buildThresholdContext = (
      thresholdValue: number,
      thresholdLabel: string,
    ): PrecisionThresholdWithContext => {
      // For @All (k >= totalCourses), use different calculation
      if (k >= totalCourses) {
        const relevantCount = Math.round(thresholdValue * totalCourses);
        return {
          meanPrecision: DecimalHelper.roundAverage(thresholdValue),
          relevantCount,
          totalCount: totalCourses,
          description: `Mean precision (${thresholdLabel}): ${fmtPct(thresholdValue)}% across all retrieved courses`,
        };
      }

      // For @K (where K < totalCourses)
      const relevantCount = Math.round(
        thresholdValue * Math.min(k, totalCourses) * sampleCount,
      );
      const totalCount = Math.min(k, totalCourses) * sampleCount;

      return {
        meanPrecision: DecimalHelper.roundAverage(thresholdValue),
        relevantCount,
        totalCount,
        description: `Mean Precision@${k} (${thresholdLabel}): ${fmtPct(thresholdValue)}% - On average, ${fmtPct(thresholdValue)}% of top-${k} courses are relevant (${sampleCount} samples)`,
      };
    };

    return {
      threshold1: buildThresholdContext(value.threshold1, '≥1'),
      threshold2: buildThresholdContext(value.threshold2, '≥2'),
      threshold3: buildThresholdContext(value.threshold3, '≥3'),
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
