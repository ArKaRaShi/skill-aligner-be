/**
 * Project-wide test helpers for common mock data.
 *
 * Provides frequently used mock builders across all tests.
 */

/**
 * Create a mock entity with timestamps.
 * Useful for database entities that need createdAt/updatedAt.
 *
 * @param overrides - Optional field overrides
 * @returns Mock entity object with timestamps
 *
 * @example
 * const entity = mockEntityWithTimestamps({ id: mockIdentifier() });
 */
export function mockEntityWithTimestamps(
  overrides: Record<string, unknown> = {},
) {
  const now = new Date();
  return {
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create mock pagination parameters.
 *
 * @param overrides - Optional field overrides
 * @returns Mock pagination params
 *
 * @example
 * const pagination = mockPagination({ page: 2, limit: 50 });
 */
export function mockPagination(
  overrides: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {},
) {
  return {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc' as const,
    ...overrides,
  };
}

/**
 * Create a mock paginated response.
 *
 * @param items - Array of items
 * @param total - Total count (default: items.length)
 * @param pagination - Pagination info (optional)
 * @returns Mock paginated response
 *
 * @example
 * const response = mockPaginatedResponse([item1, item2], 100);
 */
export function mockPaginatedResponse<T>(
  items: T[],
  total?: number,
  pagination?: { page: number; limit: number },
) {
  return {
    data: items,
    pagination: {
      total: total ?? items.length,
      page: pagination?.page ?? 1,
      limit: pagination?.limit ?? 10,
      totalPages: Math.ceil(
        (total ?? items.length) / (pagination?.limit ?? 10),
      ),
    },
  };
}

/**
 * Create a mock error object.
 *
 * @param message - Error message
 * @param code - Error code (optional)
 * @param statusCode - HTTP status code (default: 500)
 * @returns Mock error object
 *
 * @example
 * const error = mockError('Not found', 'NOT_FOUND', 404);
 */
export function mockError(
  message: string,
  code?: string,
  statusCode: number = 500,
) {
  const error: Error & { code?: string; statusCode?: number } = new Error(
    message,
  );
  error.code = code;
  error.statusCode = statusCode;
  return error;
}

/**
 * Create a mock array with a factory function.
 *
 * @param count - Number of items to create
 * @param factory - Factory function that receives the index
 * @returns Array of mock items
 *
 * @example
 * const users = mockArray(5, (i) => ({ id: mockIdWithSuffix('user', i), name: `User ${i}` }));
 */
export function mockArray<T>(
  count: number,
  factory: (index: number) => T,
): T[] {
  return Array.from({ length: count }, (_, i) => factory(i));
}
