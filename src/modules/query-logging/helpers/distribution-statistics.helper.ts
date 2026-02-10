import type { CostStatistics } from '../types/query-analytics.type';

/**
 * Extended statistics including standard deviation.
 */
export interface DistributionStatistics extends CostStatistics {
  stdDev: number;
}

/**
 * Static helper class for computing distribution statistics.
 *
 * Extends CostStatisticsHelper with standard deviation, percentiles, and histograms.
 *
 * @example
 * ```ts
 * import { DistributionStatisticsHelper } from '../helpers/distribution-statistics.helper';
 *
 * const values = [1, 2, 3, 4, 5];
 * const stats = DistributionStatisticsHelper.computeDistributionStats(values);
 * console.log(stats.stdDev); // 1.414
 * ```
 */
export class DistributionStatisticsHelper {
  /**
   * Compute distribution statistics including standard deviation.
   *
   * @param values - Array of numeric values
   * @returns Distribution statistics with stdDev
   */
  static computeDistributionStats(values: number[]): DistributionStatistics {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
        stdDev: 0,
      };
    }

    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate standard deviation (population)
    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
      count,
      sum,
      average,
      min,
      max,
      stdDev,
    };
  }

  /**
   * Compute Pearson correlation coefficient between two arrays.
   *
   * @param x - First array of values
   * @param y - Second array of values (must be same length as x)
   * @returns Correlation coefficient (-1 to 1)
   */
  static computeCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator =
      Math.sqrt(n * sumX2 - sumX * sumX) * Math.sqrt(n * sumY2 - sumY * sumY);

    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  }

  /**
   * Create histogram buckets from values.
   *
   * @param values - Array of numeric values
   * @param bucketSize - Size of each bucket (default: 10)
   * @returns Array of buckets with counts
   */
  static createHistogram(
    values: number[],
    bucketSize = 10,
  ): Array<{ range: string; count: number; percentage: number }> {
    if (values.length === 0) {
      return [];
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    // If all values are the same, return single bucket
    if (min === max) {
      return [
        {
          range: `${min}`,
          count: values.length,
          percentage: 100,
        },
      ];
    }

    // Create buckets
    const buckets = new Map<string, number>();
    const bucketStart = Math.floor(min / bucketSize) * bucketSize;

    for (const value of values) {
      const bucketIndex = Math.floor((value - bucketStart) / bucketSize);
      const bucketMin = bucketStart + bucketIndex * bucketSize;
      const bucketMax = bucketMin + bucketSize - 1;
      const range = `${bucketMin}-${bucketMax}`;

      buckets.set(range, (buckets.get(range) || 0) + 1);
    }

    // Convert to array with percentages
    const total = values.length;
    return Array.from(buckets.entries())
      .map(([range, count]) => ({
        range,
        count,
        percentage: (count / total) * 100,
      }))
      .sort((a, b) => {
        // Sort by range start number
        const aStart = Number.parseInt(a.range.split('-')[0], 10);
        const bStart = Number.parseInt(b.range.split('-')[0], 10);
        return aStart - bStart;
      });
  }

  /**
   * Calculate percentile from sorted array.
   *
   * @param sortedValues - Sorted array of numeric values
   * @param percentile - Percentile to calculate (0-100)
   * @returns Percentile value
   */
  static calculatePercentile(
    sortedValues: number[],
    percentile: number,
  ): number {
    if (sortedValues.length === 0) {
      return 0;
    }

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (upper >= sortedValues.length) {
      return sortedValues[sortedValues.length - 1];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }
}
