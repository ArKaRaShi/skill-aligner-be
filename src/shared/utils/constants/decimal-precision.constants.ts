/**
 * Precision constants for decimal operations across the codebase.
 *
 * Single source of truth for:
 * - Test assertion tolerance (toBeCloseTo precision parameter)
 * - Display formatting (toFixed decimal places)
 * - DecimalHelper operations (decimalPlaces parameter)
 *
 * ## Usage Examples
 *
 * ### In Tests (Jest toBeCloseTo)
 * ```typescript
 * import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
 *
 * expect(result.cost).toBeCloseTo(expected, DECIMAL_PRECISION.COST);
 * expect(result.rate).toBeCloseTo(expected, DECIMAL_PRECISION.RATE);
 * ```
 *
 * ### In Production Code (toFixed)
 * ```typescript
 * console.log(`Cost: $${cost.toFixed(DECIMAL_PRECISION.CURRENCY_DISPLAY)}`);
 * console.log(`Score: ${score.toFixed(DECIMAL_PRECISION.SCORE)}`);
 * ```
 *
 * ### With DecimalHelper
 * ```typescript
 * import { DecimalHelper } from 'src/shared/utils/decimal.helper';
 *
 * const rounded = DecimalHelper.round(value, DECIMAL_PRECISION.AVERAGE);
 * const formatted = DecimalHelper.formatCurrency(value, DECIMAL_PRECISION.COST);
 * ```
 *
 * ## Precision Concepts
 *
 * This file handles **assertion/format precision** (tolerance levels).
 *
 * For **arithmetic exactness** (avoiding floating-point errors), use DecimalHelper:
 * - DecimalHelper.sum(0.008, 0.001) → 0.009 (exact, not 0.009000000000000001)
 * - Use THIS file for rounding/display tolerance
 * - Use DecimalHelper for exact calculations
 */
export const DECIMAL_PRECISION = {
  /**
   * Cost calculations (6 decimal places for micro-dollar precision).
   *
   * Use for:
   * - LLM token costs (e.g., $0.000150 per token)
   * - Embedding costs
   * - Total query cost aggregations
   *
   * Example: $0.000123
   */
  COST: 6,

  /**
   * Average calculations (4 decimal places).
   *
   * Use for:
   * - Mean values of metrics
   * - Average scores across datasets
   * - Statistical averages
   *
   * Example: 0.1234
   */
  AVERAGE: 4,

  /**
   * Percentage/rate calculations (3 decimal places).
   *
   * Use for:
   * - LLM decision rates
   * - Rejection/fallback rates
   * - Success/failure percentages
   *
   * Example: 0.333 (33.3%)
   */
  RATE: 3,

  /**
   * Evaluation scores (3 decimal places for 1-3 Likert scale).
   *
   * Use for:
   * - Skill relevance scores (1-3 scale)
   * - Context alignment scores (1-3 scale)
   * - Alignment gap calculations
   *
   * Example: 2.333 / 3.0
   */
  SCORE: 3,

  /**
   * Display percentages (2 decimal places).
   *
   * Use for:
   * - User-facing percentage displays
   * - Console output for percentages
   * - Distribution percentages
   *
   * Example: 33.33%
   */
  PERCENTAGE: 2,

  /**
   * Token counts (0 decimal places - integers).
   *
   * Use for:
   * - Token counts (input/output/total)
   * - Displaying integer quantities
   *
   * Example: 1000 (not 1000.0)
   */
  TOKEN: 0,

  /**
   * Duration formatting (2 decimal places for seconds).
   *
   * Use for:
   * - Query execution time
   * - Pipeline step duration
   * - Performance metrics
   *
   * Example: 1.23s
   */
  TIME: 2,

  /**
   * Currency display in console output (4 decimal places).
   *
   * Use for:
   * - CLI/console cost output
   * - User-facing cost display
   * - Formatted cost strings
   *
   * Example: $0.0002 (more readable than $0.000150)
   */
  CURRENCY_DISPLAY: 4,

  /**
   * High-precision test assertions (9 decimal places).
   *
   * Use for:
   * - Internal calculation verification
   * - Multi-step arithmetic precision checks
   * - Ensuring no floating-point drift in complex operations
   *
   * Example: 0.123456789
   */
  TEST_HIGH_PRECISION: 9,

  /**
   * Context alignment/mismatch rates (1 decimal place).
   *
   * Use for:
   * - Coarse-grained rate metrics
   * - High-level percentage summaries
   * - Context mismatch rate display
   *
   * Example: 30.0%
   */
  RATE_COARSE: 1,
} as const;

/**
 * Helper to get precision for a given category.
 * Useful for dynamic precision selection based on runtime conditions.
 *
 * @param category - The precision category key
 * @returns The precision value (number of decimal places)
 *
 * @example
 * const precision = getPrecision('COST'); // 6
 * console.log(value.toFixed(precision));
 */
export function getPrecision(category: keyof typeof DECIMAL_PRECISION): number {
  return DECIMAL_PRECISION[category];
}

/**
 * Type-safe precision category keys.
 * Use this for function parameters that accept precision categories.
 */
export type PrecisionCategory = keyof typeof DECIMAL_PRECISION;
