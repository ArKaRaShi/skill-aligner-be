import type { CostStatistics } from '../types/query-analytics.type';

/**
 * Static helper class for computing cost statistics.
 *
 * All methods are static - no instantiation needed.
 *
 * @example
 * ```ts
 * import { CostStatisticsHelper } from '../helpers/cost-statistics.helper';
 *
 * const costs = [0.001, 0.002, 0.003, 0.004, 0.005];
 * const stats = CostStatisticsHelper.computeStatistics(costs);
 * console.log(stats.average); // 0.003
 * ```
 */
export class CostStatisticsHelper {
  /**
   * Compute basic statistics from an array of cost values.
   *
   * @param values - Array of cost values (must not be empty)
   * @returns Cost statistics (sum, average, min, max, count)
   * @throws Error if values array is empty
   */
  static computeStatistics(values: number[]): CostStatistics {
    if (values.length === 0) {
      throw new Error('Cannot compute statistics on empty array');
    }

    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / count;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count,
      sum,
      average,
      min,
      max,
    };
  }

  /**
   * Compute statistics from an array that may contain null/undefined values.
   * Filters out null/undefined before computing.
   *
   * @param values - Array that may contain null/undefined
   * @returns Cost statistics, or null if no valid values
   */
  static computeStatisticsSafe(
    values: Array<number | null | undefined>,
  ): CostStatistics | null {
    const validValues = values.filter((v): v is number => v != null);

    if (validValues.length === 0) {
      return null;
    }

    return this.computeStatistics(validValues);
  }
}
