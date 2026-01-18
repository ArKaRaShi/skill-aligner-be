/**
 * Project-wide test fixtures.
 *
 * Universal mock helpers for use across all test files.
 * Eliminates the need for `as any` casts and provides consistent test data.
 *
 * @example
 * import { mockIdentifier, mockIdWithSuffix, mockDate } from '@/test/fixtures';
 *
 * const userId = mockIdentifier(); // No 'as any' needed!
 * const logId = mockIdWithSuffix('log', 1);
 * const createdAt = mockDate();
 */

// Identifier helpers
export {
  mockIdentifier,
  mockIdWithSuffix,
  mockIds,
  mockUuid,
  mockIdGenerator,
} from './identifier.helpers';

// Date helpers
export {
  mockDate,
  mockIsoDate,
  mockTimestamp,
  mockTimestamps,
  mockFixedDate,
  mockRelativeDates,
} from './date.helpers';

// Common mock builders
export {
  mockEntityWithTimestamps,
  mockPagination,
  mockPaginatedResponse,
  mockError,
  mockArray,
} from './common.mocks';
