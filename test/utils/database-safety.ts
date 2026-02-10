/**
 * Database Safety Utility
 *
 * Centralized database URL validation to prevent running tests
 * against protected production/development databases.
 *
 * SECURITY: This module uses shared constants from database-safety.constants.ts
 * to ensure consistency between test and runtime protection.
 */
import dotenv from 'dotenv';
import {
  FORBIDDEN_DATABASE_PATTERNS,
  FORBIDDEN_DATABASE_URLS,
} from 'src/shared/kernel/database/database-safety.constants';

// Load environment variables
dotenv.config();

/**
 * Validates the DATABASE_URL environment variable
 * @throws Error if database URL is forbidden or not set
 */
export function validateDatabaseUrl(): void {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      '\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        '❌ DATABASE SAFETY ERROR\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
        'DATABASE_URL environment variable is not set.\n' +
        '\n' +
        'Tests require a database to run against.\n' +
        'Please set DATABASE_URL in your .env file or environment.\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
    );
  }

  // Check against exact forbidden URLs
  for (const forbiddenUrl of FORBIDDEN_DATABASE_URLS) {
    if (databaseUrl === forbiddenUrl) {
      throw new Error(
        '\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '🚨 SECURITY ALERT: TESTS BLOCKED 🚨\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          'You are attempting to run tests against a PROTECTED database:\n' +
          `\n  ${forbiddenUrl}\n` +
          '\n' +
          '⚠️  This could cause IRREVERSIBLE DATA LOSS or CORRUPTION!\n' +
          '\n' +
          'To fix this:\n' +
          '  1. Set up a separate test database\n' +
          '  2. Update DATABASE_URL to point to the test database\n' +
          '  3. Run tests again\n' +
          '\n' +
          'Example test database URL:\n' +
          '  postgresql://user:password@localhost:5432/appdb_test?schema=public\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
      );
    }
  }

  // Check against forbidden patterns
  for (const pattern of FORBIDDEN_DATABASE_PATTERNS) {
    if (pattern.test(databaseUrl)) {
      throw new Error(
        '\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          '🚨 SECURITY ALERT: TESTS BLOCKED 🚨\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
          'Your DATABASE_URL matches a forbidden pattern:\n' +
          `\n  Pattern: ${pattern}\n` +
          `  URL: ${databaseUrl}\n` +
          '\n' +
          '⚠️  This could cause IRREVERSIBLE DATA LOSS or CORRUPTION!\n' +
          '\n' +
          'To fix this:\n' +
          '  1. Set up a separate test database\n' +
          '  2. Update DATABASE_URL to point to the test database\n' +
          '  3. Run tests again\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
      );
    }
  }

  // Warn if database name doesn't contain "test"
  const dbUrlLower = databaseUrl.toLowerCase();
  if (!dbUrlLower.includes('test')) {
    console.warn(
      '\n' +
        '⚠️  WARNING: DATABASE_URL does not contain "test"\n' +
        `    Current: ${databaseUrl}\n` +
        '    Consider using a dedicated test database.\n',
    );
  }
}

/**
 * Validates database URL for integration tests (with logging)
 */
export function validateDatabaseUrlForIntegrationTests(): void {
  const databaseUrl = process.env.DATABASE_URL;
  validateDatabaseUrl();

  if (databaseUrl && databaseUrl.toLowerCase().includes('test')) {
    console.log(
      '\n' +
        '✅ Database safety check passed.\n' +
        `    Using: ${databaseUrl}\n`,
    );
  }
}
