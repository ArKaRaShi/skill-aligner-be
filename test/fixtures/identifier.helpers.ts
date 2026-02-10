import type { Identifier } from 'src/shared/contracts/types/identifier';

/**
 * Project-wide test helpers for Identifier mocking.
 *
 * Eliminates the need for `as any` or `as Identifier` casts in tests.
 */

/**
 * Create a mock identifier with a simple string value.
 * Type-safe - no casting needed in tests.
 *
 * @param value - The identifier value (default: random UUID)
 * @returns A typed Identifier
 *
 * @example
 * const id = mockIdentifier(); // Returns type Identifier
 * const logId = mockIdentifier('log-1');
 */
export function mockIdentifier(value?: string): Identifier {
  return (value || `mock-${crypto.randomUUID()}`) as Identifier;
}

/**
 * Create a mock identifier with a numeric suffix.
 * Useful for creating sequences like 'user-1', 'user-2', etc.
 *
 * @param prefix - The prefix for the identifier
 * @param suffix - The numeric suffix (default: 1)
 * @returns A typed Identifier
 *
 * @example
 * const id1 = mockIdWithSuffix('user', 1); // 'user-1' as Identifier
 * const id2 = mockIdWithSuffix('user', 2); // 'user-2' as Identifier
 */
export function mockIdWithSuffix(
  prefix: string,
  suffix: number = 1,
): Identifier {
  return `${prefix}-${suffix}` as Identifier;
}

/**
 * Create multiple mock identifiers with a common prefix.
 *
 * @param prefix - The prefix for each identifier
 * @param count - Number of identifiers to create
 * @returns Array of typed Identifiers
 *
 * @example
 * const ids = mockIds('log', 3);
 * // ['log-1', 'log-2', 'log-3'] as Identifier[]
 */
export function mockIds(prefix: string, count: number): Identifier[] {
  return Array.from({ length: count }, (_, i) =>
    mockIdWithSuffix(prefix, i + 1),
  );
}

/**
 * Create a mock UUID-based identifier.
 * Generates a random UUID for each call.
 *
 * @returns A typed Identifier with UUID format
 *
 * @example
 * const id = mockUuid(); // '123e4567-e89b-12d3-a456-426614174000' as Identifier
 */
export function mockUuid(): Identifier {
  return crypto.randomUUID() as Identifier;
}

/**
 * Create deterministic mock identifiers for testing.
 * Uses a simple counter to generate consistent identifiers across test runs.
 *
 * @param prefix - The prefix for the identifier
 * @returns A function that returns sequential identifiers
 *
 * @example
 * const userIdGen = mockIdGenerator('user');
 * const user1 = userIdGen(); // 'user-1'
 * const user2 = userIdGen(); // 'user-2'
 */
export function mockIdGenerator(prefix: string) {
  let count = 0;
  return () => {
    count++;
    return mockIdWithSuffix(prefix, count);
  };
}
