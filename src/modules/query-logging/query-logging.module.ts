import { Module } from '@nestjs/common';

import { I_QUERY_LOGGING_REPOSITORY } from './contracts/i-query-logging-repository.contract';
import { I_QUERY_LOGGING_SERVICE } from './contracts/i-query-logging-service.contract';
import { PrismaQueryLoggingRepository } from './repositories/prisma-query-logging.repository';
import { QueryLoggingService } from './services/query-logging.service';

@Module({
  providers: [
    {
      provide: I_QUERY_LOGGING_SERVICE,
      useClass: QueryLoggingService,
    },
    {
      provide: I_QUERY_LOGGING_REPOSITORY,
      useClass: PrismaQueryLoggingRepository,
    },
  ],
  exports: [I_QUERY_LOGGING_SERVICE, I_QUERY_LOGGING_REPOSITORY],
})
export class QueryLoggingModule {}
