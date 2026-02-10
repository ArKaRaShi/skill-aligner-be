import { validateDatabaseUrlForIntegrationTests } from './utils/database-safety';

/**
 * Jest Unit Test Setup
 *
 * This file runs before all unit tests to ensure safety:
 * - Sets NODE_ENV to 'test' for safety checks
 * - Validates that tests are not running against production/dev databases
 * - Prevents accidental data loss or corruption
 */

// Set NODE_ENV to test BEFORE any other imports

process.env.NODE_ENV = 'test';

// Run validation immediately when setup file loads
validateDatabaseUrlForIntegrationTests();
