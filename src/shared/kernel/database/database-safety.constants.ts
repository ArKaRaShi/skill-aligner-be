/**
 * Database Safety Configuration
 *
 * Centralized configuration for protecting against accidental database connections.
 * Any database URL or pattern listed here will be blocked at runtime and during tests.
 *
 * SECURITY: This is the SINGLE SOURCE OF TRUTH for database safety rules.
 * Updates here will apply to both test setup and runtime protection.
 */

/**
 * Exact database URLs that should NEVER be connected to
 * Add production/development databases here to protect them
 */
export const FORBIDDEN_DATABASE_URLS = [
  'postgresql://user:password123@localhost:5433/appdb?schema=public',
  // Add other protected databases here:
  // 'postgresql://user:pass@production-host:5432/proddb?schema=public',
] as const;

/**
 * Regex patterns for database URLs that should be blocked
 * Useful for catching similar URLs or production-like databases
 */
export const FORBIDDEN_DATABASE_PATTERNS = [
  /localhost:5433\/appdb/, // Specific dev database
  /production/i, // Any URL containing "production"
  /prod/i, // Any URL containing "prod"
  /pooler\.supabase\.com/i, // Supabase pooler connection (production traffic)

  // Add more patterns as needed:
  // /staging/i,
  // /:5432\//, // Block default PostgreSQL port in production
] as const;

/**
 * Combined safety configuration object
 * Convenience export for importing everything at once
 */
export const DATABASE_SAFETY_CONFIG = {
  FORBIDDEN_URLS: FORBIDDEN_DATABASE_URLS,
  FORBIDDEN_PATTERNS: FORBIDDEN_DATABASE_PATTERNS,
} as const;
