import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { PrismaClient } from '@prisma/client';

import { AppConfigService } from 'src/shared/kernel/config/app-config.service';

import {
  FORBIDDEN_DATABASE_PATTERNS,
  FORBIDDEN_DATABASE_URLS,
} from './database-safety.constants';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly appConfig: AppConfigService) {
    super();
  }

  async onModuleInit() {
    // Validate database URL before connecting (only during tests)
    // During normal development/production, we trust the configured DATABASE_URL
    if (this.appConfig.nodeEnv === 'test') {
      this.validateDatabaseConnection();
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runtime database safety check
   * This prevents database connection to protected databases during TESTS.
   * Only enforced when NODE_ENV === 'test'.
   *
   * Note: Test-time validation happens in jest-integration.setup.ts
   * This is a secondary protection for any test code that might bypass setup.
   * @private
   */
  private validateDatabaseConnection(): void {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return; // Prisma will handle missing DATABASE_URL
    }

    // Check against exact forbidden URLs
    for (const forbiddenUrl of FORBIDDEN_DATABASE_URLS) {
      if (databaseUrl === forbiddenUrl) {
        throw new Error(
          '\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            '🚨 RUNTIME SECURITY ALERT: DATABASE CONNECTION BLOCKED 🚨\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            'Attempted connection to a PROTECTED database:\n' +
            `\n  ${forbiddenUrl}\n` +
            '\n' +
            '⚠️  This operation was blocked to prevent IRREVERSIBLE DATA LOSS!\n' +
            '\n' +
            'To fix this:\n' +
            '  1. Set DATABASE_URL to a safe test database\n' +
            '  2. Restart the application\n' +
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
            '🚨 RUNTIME SECURITY ALERT: DATABASE CONNECTION BLOCKED 🚨\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            'DATABASE_URL matches a forbidden pattern:\n' +
            `\n  Pattern: ${pattern}\n` +
            `  URL: ${databaseUrl}\n` +
            '\n' +
            '⚠️  This operation was blocked to prevent IRREVERSIBLE DATA LOSS!\n' +
            '\n' +
            'To fix this:\n' +
            '  1. Set DATABASE_URL to a safe test database\n' +
            '  2. Restart the application\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
        );
      }
    }
  }
}
