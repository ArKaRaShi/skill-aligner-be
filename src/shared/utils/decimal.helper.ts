import Decimal from 'decimal.js';

import {
  DECIMAL_PRECISION,
  type PrecisionCategory,
} from './constants/decimal-precision.constants';

/**
 * DecimalHelper - Utility for exact decimal arithmetic operations.
 *
 * JavaScript's binary floating-point arithmetic causes precision errors:
 * - 0.1 + 0.2 = 0.30000000000000004 (❌)
 * - 0.008 + 0.001 = 0.009000000000000001 (❌)
 *
 * This utility uses decimal.js library for exact decimal arithmetic:
 * - 0.1 + 0.2 = 0.3 (✅)
 * - 0.008 + 0.001 = 0.009 (✅)
 *
 * ## Usage Guide
 *
 * ### Domain-Specific Methods (Recommended)
 * Use typed methods for common operations - no precision values needed:
 * ```typescript
 * DecimalHelper.roundCost(0.0001234);           // 0.000123 (6 decimals)
 * DecimalHelper.roundScore(2.333333);           // 2.333 (3 decimals)
 * DecimalHelper.roundAverage(0.12345);          // 0.1235 (4 decimals)
 * DecimalHelper.formatCostDisplay(0.0001234);   // "0.0001" (4 decimals)
 * DecimalHelper.formatPercentage(0.3333);       // "33.33%"
 * ```
 *
 * ### Generic Methods (Flexible)
 * For custom precision or type-safe precision categories:
 * ```typescript
 * import { DECIMAL_PRECISION } from './constants/decimal-precision.constants';
 *
 * // With precision constant (type-safe)
 * DecimalHelper.round(value, DECIMAL_PRECISION.COST);
 * DecimalHelper.formatCurrency(value, DECIMAL_PRECISION.CURRENCY_DISPLAY);
 *
 * // With custom precision number
 * DecimalHelper.round(value, 5);
 * ```
 */
export class DecimalHelper {
  /**
   * Safely add numbers with exact decimal precision.
   *
   * @param values - Numbers to sum
   * @returns Exact sum
   *
   * @example
   * DecimalHelper.sum(0.008, 0.001); // 0.009 (exact)
   * DecimalHelper.sum(0.1, 0.2); // 0.3 (exact)
   */
  static sum(...values: number[]): number {
    return values
      .reduce((sum, value) => sum.plus(value), new Decimal(0))
      .toNumber();
  }

  /**
   * Safely average numbers with exact decimal precision.
   *
   * @param values - Numbers to average
   * @returns Exact average
   *
   * @example
   * DecimalHelper.average([0.0075, 0.015, 0.0225]); // 0.015 (exact)
   * DecimalHelper.average([1, 2, 3]); // 2 (exact)
   */
  static average(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((s, v) => s.plus(v), new Decimal(0));
    return sum.dividedBy(values.length).toNumber();
  }

  /**
   * Round to specific decimal places with exact precision.
   *
   * Accepts either a numeric precision or a type-safe precision category.
   *
   * @param value - Number to round
   * @param precision - Number of decimal places OR precision category (e.g., DECIMAL_PRECISION.COST)
   * @returns Rounded number
   *
   * @example
   * // With precision category (recommended)
   * import { DECIMAL_PRECISION } from './constants/decimal-precision.constants';
   * DecimalHelper.round(0.0001234, DECIMAL_PRECISION.COST); // 0.000123
   * DecimalHelper.round(2.333333, DECIMAL_PRECISION.SCORE); // 2.333
   *
   * // With custom precision
   * DecimalHelper.round(0.0090001, 3); // 0.009
   * DecimalHelper.round(0.015678, 2); // 0.02
   *
   * // Domain-specific methods (even simpler - no precision needed)
   * DecimalHelper.roundCost(0.0001234); // 0.000123
   * DecimalHelper.roundScore(2.333333); // 2.333
   */
  static round(
    value: number,
    precision: number | PrecisionCategory = 2,
  ): number {
    const decimalPlaces =
      typeof precision === 'number' ? precision : DECIMAL_PRECISION[precision];
    return new Decimal(value).toDecimalPlaces(decimalPlaces).toNumber();
  }

  /**
   * Multiply numbers with exact decimal precision.
   *
   * @param values - Numbers to multiply
   * @returns Exact product
   *
   * @example
   * DecimalHelper.multiply(0.01, 100); // 1 (exact)
   * DecimalHelper.multiply(0.005, 2); // 0.01 (exact)
   */
  static multiply(...values: number[]): number {
    return values
      .reduce((product, value) => product.times(value), new Decimal(1))
      .toNumber();
  }

  /**
   * Divide numbers with exact decimal precision.
   *
   * @param dividend - Number to divide
   * @param divisor - Number to divide by
   * @returns Exact quotient
   *
   * @example
   * DecimalHelper.divide(0.01, 2); // 0.005 (exact)
   * DecimalHelper.divide(1, 3); // 0.33333... (exact, not truncated)
   */
  static divide(dividend: number, divisor: number): number {
    return new Decimal(dividend).dividedBy(divisor).toNumber();
  }

  /**
   * Create a Decimal instance for chaining operations.
   * Useful when you need to perform multiple operations.
   *
   * @param value - Initial value
   * @returns Decimal instance
   *
   * @example
   * const result = DecimalHelper.create(0.01)
   *   .plus(0.001)
   *   .times(2)
   *   .toDecimalPlaces(4)
   *   .toNumber(); // 0.022
   */
  static create(value: number): Decimal {
    return new Decimal(value);
  }

  /**
   * Compare two decimal values exactly.
   *
   * @param a - First value
   * @param b - Second value
   * @returns Comparison result (-1, 0, or 1)
   *
   * @example
   * DecimalHelper.compare(0.01, 0.01); // 0 (equal)
   * DecimalHelper.compare(0.009, 0.01); // -1 (less than)
   * DecimalHelper.compare(0.02, 0.01); // 1 (greater than)
   */
  static compare(a: number, b: number): number {
    return new Decimal(a).comparedTo(b);
  }

  /**
   * Check if two decimal values are exactly equal.
   *
   * @param a - First value
   * @param b - Second value
   * @returns True if exactly equal
   *
   * @example
   * DecimalHelper.equals(0.01, 0.010); // true
   * DecimalHelper.equals(0.009, 0.009000001); // false
   */
  static equals(a: number, b: number): boolean {
    return new Decimal(a).equals(b);
  }

  /**
   * Get the minimum value with exact comparison.
   *
   * @param values - Numbers to compare
   * @returns Minimum value
   *
   * @example
   * DecimalHelper.min(0.01, 0.005, 0.02); // 0.005
   */
  static min(...values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((min, value) =>
      new Decimal(value).lt(min) ? value : min,
    );
  }

  /**
   * Get the maximum value with exact comparison.
   *
   * @param values - Numbers to compare
   * @returns Maximum value
   *
   * @example
   * DecimalHelper.max(0.01, 0.005, 0.02); // 0.02
   */
  static max(...values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((max, value) =>
      new Decimal(value).gt(max) ? value : max,
    );
  }

  /**
   * Format a number as currency string with exact precision.
   *
   * @param value - Number to format
   * @param precision - Number of decimal places OR precision category (default: DECIMAL_PRECISION.COST)
   * @returns Formatted currency string (trailing zeros removed)
   *
   * @example
   * // Default (COST precision - 6 decimals)
   * DecimalHelper.formatCurrency(0.009); // "0.009"
   *
   * // For console display (more readable)
   * DecimalHelper.formatCurrency(0.009, DECIMAL_PRECISION.CURRENCY_DISPLAY); // "0.009"
   *
   * // With precision category
   * import { DECIMAL_PRECISION } from './constants/decimal-precision.constants';
   * DecimalHelper.formatCurrency(0.01, DECIMAL_PRECISION.CURRENCY_DISPLAY); // "0.01"
   *
   * // Domain-specific method (recommended for console output)
   * DecimalHelper.formatCostDisplay(0.009); // "0.009"
   */

  /**
   * Format a number as currency string (trailing zeros removed for readability).
   * Uses CURRENCY_DISPLAY precision (4 decimal places) by default.
   *
   * @param value - Number to format
   * @param precision - Number of decimal places OR precision category (default: CURRENCY_DISPLAY)
   * @returns Formatted string (trailing zeros removed)
   *
   * @example
   * // Default (CURRENCY_DISPLAY precision - 4 decimals, trailing zeros removed)
   * DecimalHelper.formatCurrency(0.75); // "0.75"
   * DecimalHelper.formatCurrency(0.009); // "0.009"
   * DecimalHelper.formatCurrency(10000); // "10000"
   *
   * // With custom precision
   * DecimalHelper.formatCurrency(0.12345, 2); // "0.12"
   */
  static formatCurrency(
    value: number,
    precision: number | PrecisionCategory = DECIMAL_PRECISION.CURRENCY_DISPLAY,
  ): string {
    const decimalPlaces =
      typeof precision === 'number' ? precision : DECIMAL_PRECISION[precision];
    return new Decimal(value).toDecimalPlaces(decimalPlaces).toString();
  }

  /**
   * Convert a potentially imprecise number to its exact decimal representation.
   * Useful for fixing numbers that were already calculated with floating-point errors.
   *
   * @param value - Potentially imprecise number
   * @param precision - Number of decimal places OR precision category (default: DECIMAL_PRECISION.COST)
   * @returns Exact decimal number
   *
   * @example
   * // Default (COST precision - 6 decimals)
   * DecimalHelper.fixPrecision(0.009000000000000001); // 0.009
   * DecimalHelper.fixPrecision(0.30000000000000004); // 0.3
   *
   * // With precision category
   * import { DECIMAL_PRECISION } from './constants/decimal-precision.constants';
   * DecimalHelper.fixPrecision(2.33333333, DECIMAL_PRECISION.SCORE); // 2.333
   */
  static fixPrecision(
    value: number,
    precision: number | PrecisionCategory = DECIMAL_PRECISION.COST,
  ): number {
    const decimalPlaces =
      typeof precision === 'number' ? precision : DECIMAL_PRECISION[precision];
    return new Decimal(value).toDecimalPlaces(decimalPlaces).toNumber();
  }

  // ============================================================================
  // Domain-Specific Convenience Methods
  // ============================================================================

  /**
   * Round a cost value to COST precision (6 decimal places).
   * Use for LLM token costs, embedding costs, and monetary calculations.
   *
   * @param value - Cost value to round
   * @returns Rounded cost with 6 decimal places
   *
   * @example
   * DecimalHelper.roundCost(0.0001234); // 0.000123
   * DecimalHelper.roundCost(0.0090001); // 0.009
   */
  static roundCost(value: number): number {
    return this.round(value, DECIMAL_PRECISION.COST);
  }

  /**
   * Round an average value to AVERAGE precision (4 decimal places).
   * Use for mean values, statistical averages, and aggregated metrics.
   *
   * @param value - Average value to round
   * @returns Rounded average with 4 decimal places
   *
   * @example
   * DecimalHelper.roundAverage(0.12345); // 0.1235
   * DecimalHelper.roundAverage(2.12345); // 2.1235
   */
  static roundAverage(value: number): number {
    return this.round(value, DECIMAL_PRECISION.AVERAGE);
  }

  /**
   * Round a rate value to RATE precision (3 decimal places).
   * Use for percentages, rates, and ratio calculations.
   *
   * @param value - Rate value to round
   * @returns Rounded rate with 3 decimal places
   *
   * @example
   * DecimalHelper.roundRate(0.3333); // 0.333
   * DecimalHelper.roundRate(0.6666); // 0.667
   */
  static roundRate(value: number): number {
    return this.round(value, DECIMAL_PRECISION.RATE);
  }

  /**
   * Round a score value to SCORE precision (3 decimal places).
   * Use for evaluation scores (1-3 Likert scale), skill relevance, context alignment.
   *
   * @param value - Score value to round
   * @returns Rounded score with 3 decimal places
   *
   * @example
   * DecimalHelper.roundScore(2.333333); // 2.333
   * DecimalHelper.roundScore(1.666666); // 1.667
   */
  static roundScore(value: number): number {
    return this.round(value, DECIMAL_PRECISION.SCORE);
  }

  /**
   * Format cost with CURRENCY_DISPLAY precision (4 decimal places).
   * By default removes trailing zeros for readability. Set preserveTrailingZeros=true
   * for tabular data or reports where consistent decimal places are needed.
   *
   * @param value - Cost value to format
   * @param preserveTrailingZeros - Whether to preserve trailing zeros (default: false)
   * @returns Formatted cost string
   *
   * @example
   * // Without trailing zeros (default - more readable)
   * DecimalHelper.formatCost(0.0001234); // "0.0001"
   * DecimalHelper.formatCost(0.009); // "0.009"
   * DecimalHelper.formatCost(0.75); // "0.75"
   *
   * // With trailing zeros (for tabular data/reports)
   * DecimalHelper.formatCost(0.75, true); // "0.7500"
   * DecimalHelper.formatCost(10000, true); // "10000.0000"
   */
  static formatCost(
    value: number,
    preserveTrailingZeros: boolean = false,
  ): string {
    const formatted = this.formatCurrency(
      value,
      DECIMAL_PRECISION.CURRENCY_DISPLAY,
    );

    if (!preserveTrailingZeros) {
      return formatted;
    }

    // Manually add trailing zeros to preserve exact 4 decimal places
    const parts = formatted.split('.');
    if (parts.length === 1) {
      // No decimal point - add decimal point and zeros
      return `${parts[0]}.${'0'.repeat(DECIMAL_PRECISION.CURRENCY_DISPLAY)}`;
    }

    const [integerPart, decimalPart] = parts;
    const zerosNeeded = DECIMAL_PRECISION.CURRENCY_DISPLAY - decimalPart.length;
    return `${integerPart}.${decimalPart}${'0'.repeat(zerosNeeded)}`;
  }

  /**
   * Format a decimal value (0-1) as a percentage string with PERCENTAGE precision.
   * Automatically multiplies by 100 and formats with 2 decimal places.
   *
   * @param value - Decimal value between 0 and 1
   * @returns Formatted percentage string (e.g., "33.33")
   *
   * @example
   * DecimalHelper.formatPercentage(0.3333); // "33.33"
   * DecimalHelper.formatPercentage(0.6666); // "66.66"
   * DecimalHelper.formatPercentage(1); // "100.00"
   */
  static formatPercentage(value: number): string {
    return (value * 100).toFixed(DECIMAL_PRECISION.PERCENTAGE);
  }

  /**
   * Format a time duration in seconds with TIME precision (2 decimal places).
   * Use for query execution time, pipeline duration, performance metrics.
   *
   * @param seconds - Duration in seconds
   * @returns Formatted time string with 2 decimal places
   *
   * @example
   * DecimalHelper.formatTime(1.23456); // "1.23"
   * DecimalHelper.formatTime(0.999); // "1.00"
   */
  static formatTime(seconds: number): string {
    return seconds.toFixed(DECIMAL_PRECISION.TIME);
  }
}
