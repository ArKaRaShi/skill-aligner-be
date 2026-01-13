import { Module } from '@nestjs/common';

import {
  I_QUERY_LOGGING_REPOSITORY_TOKEN,
  type IQueryLoggingRepository,
} from './contracts/i-query-logging-repository.contract';
import { PrismaQueryLoggingRepositoryProvider } from './repositories/prisma-query-logging.repository';
import { QueryAnalyticsService } from './services/query-analytics.service';
import { QueryPipelineLoggerService } from './services/query-pipeline-logger.service';
import { QueryPipelineReaderService } from './services/query-pipeline-reader.service';

/**
 * Query Logging Module
 * Provides QueryPipelineLoggerService for logging query processing steps,
 * QueryPipelineReaderService for reading and parsing logged data,
 * and QueryAnalyticsService for computing cost and token analytics.
 *
 * Note: This module is NOT @Global(). Must be explicitly imported by modules that need it.
 */
@Module({
  providers: [
    PrismaQueryLoggingRepositoryProvider,
    {
      provide: QueryPipelineLoggerService,
      inject: [I_QUERY_LOGGING_REPOSITORY_TOKEN],
      useFactory: (repository: IQueryLoggingRepository) => {
        return new QueryPipelineLoggerService(repository);
      },
    },
    {
      provide: QueryPipelineReaderService,
      inject: [I_QUERY_LOGGING_REPOSITORY_TOKEN],
      useFactory: (repository: IQueryLoggingRepository) => {
        return new QueryPipelineReaderService(repository);
      },
    },
    {
      provide: QueryAnalyticsService,
      inject: [I_QUERY_LOGGING_REPOSITORY_TOKEN],
      useFactory: (repository: IQueryLoggingRepository) => {
        return new QueryAnalyticsService(repository);
      },
    },
  ],
  exports: [
    QueryPipelineLoggerService,
    QueryPipelineReaderService,
    QueryAnalyticsService,
  ],
})
export class QueryLoggingModule {}
