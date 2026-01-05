import { Module } from '@nestjs/common';

import {
  I_QUERY_LOGGING_REPOSITORY_TOKEN,
  type IQueryLoggingRepository,
} from './contracts/i-query-logging-repository.contract';
import { PrismaQueryLoggingRepositoryProvider } from './repositories/prisma-query-logging.repository';
import { QueryPipelineLoggerService } from './services/query-pipeline-logger.service';

/**
 * Query Logging Module
 * Provides QueryPipelineLoggerService for logging query processing steps.
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
  ],
  exports: [QueryPipelineLoggerService],
})
export class QueryLoggingModule {}
