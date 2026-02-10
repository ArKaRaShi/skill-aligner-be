/**
 * Project-wide test helpers for Date/Timestamp mocking.
 *
 * Provides consistent date creation across all tests.
 */

/**
 * Create a mock date with an optional offset from now.
 *
 * @param offsetMs - Milliseconds offset from now (default: 0)
 * @param baseDate - Base date to offset from (default: now)
 * @returns A Date object
 *
 * @example
 * const now = mockDate();
 * const yesterday = mockDate(-86400000); // 1 day ago
 * const tomorrow = mockDate(86400000); // 1 day from now
 * const fixedDate = mockDate(0, new Date('2024-01-01'));
 */
export function mockDate(
  offsetMs: number = 0,
  baseDate: Date = new Date(),
): Date {
  return new Date(baseDate.getTime() + offsetMs);
}

/**
 * Create a mock ISO date string.
 *
 * @param date - Date to convert (default: now)
 * @returns ISO date string
 *
 * @example
 * const isoDate = mockIsoDate(); // '2024-01-18T13:30:00.000Z'
 */
export function mockIsoDate(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Create a mock Unix timestamp (milliseconds since epoch).
 *
 * @param offsetMs - Milliseconds offset from now (default: 0)
 * @returns Unix timestamp in milliseconds
 *
 * @example
 * const timestamp = mockTimestamp(); // Current time as number
 * const oneHourAgo = mockTimestamp(-3600000);
 */
export function mockTimestamp(offsetMs: number = 0): number {
  return Date.now() + offsetMs;
}

/**
 * Create multiple mock timestamps with intervals.
 *
 * @param count - Number of timestamps to create
 * @param intervalMs - Interval between timestamps (default: 1000ms)
 * @returns Array of timestamps
 *
 * @example
 * const timestamps = mockTimestamps(3, 60000);
 * // [now, now + 60000, now + 120000]
 */
export function mockTimestamps(
  count: number,
  intervalMs: number = 1000,
): number[] {
  const base = Date.now();
  return Array.from({ length: count }, (_, i) => base + i * intervalMs);
}

/**
 * Create a fixed date for consistent testing.
 * Uses a specific date that doesn't change between test runs.
 *
 * @param dateString - ISO date string (default: '2024-01-01T00:00:00.000Z')
 * @returns A fixed Date object
 *
 * @example
 * const fixed = mockFixedDate('2024-01-01T10:00:00.000Z');
 */
export function mockFixedDate(dateString?: string): Date {
  return new Date(dateString || '2024-01-01T00:00:00.000Z');
}

/**
 * Create dates relative to a base date.
 * Useful for creating sequences like createdAt, updatedAt, completedAt.
 *
 * @param baseDate - The base date
 * @param offsets - Array of millisecond offsets
 * @returns Array of Dates
 *
 * @example
 * const dates = mockRelativeDates(new Date('2024-01-01'), [0, -1000, 60000]);
 * // [2024-01-01T00:00:00, 2023-12-31T23:59:59, 2024-01-01T00:01:00]
 */
export function mockRelativeDates(baseDate: Date, offsets: number[]): Date[] {
  return offsets.map((offset) => mockDate(offset, baseDate));
}
