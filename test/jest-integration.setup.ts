/**
 * Jest Integration Test Setup
 *
 * This file runs before all integration tests to ensure safety:
 * - Validates that tests are not running against production/dev databases
 * - Prevents accidental data loss or corruption
 */
import { validateDatabaseUrlForIntegrationTests } from './utils/database-safety';

// Run validation immediately when setup file loads
validateDatabaseUrlForIntegrationTests();
