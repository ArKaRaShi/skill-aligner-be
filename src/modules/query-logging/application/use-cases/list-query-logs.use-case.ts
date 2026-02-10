import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';

import { PaginationHelper } from 'src/shared/contracts/api/pagination/pagination.helper';

import {
  I_QUERY_LOGGING_REPOSITORY_TOKEN,
  type IQueryLoggingRepository,
} from '../../contracts/i-query-logging-repository.contract';
import type { QueryProcessLog } from '../../types/query-log.type';
import type { QueryStatus } from '../../types/query-status.type';

export type ListQueryLogsUseCaseInput = {
  page?: number;
  pageSize?: number;
  status?: QueryStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
};

export type ListQueryLogsUseCaseOutput = {
  logs: QueryProcessLog[];
  totalItems: number;
};

@Injectable()
export class ListQueryLogsUseCase {
  private readonly logger = new Logger(ListQueryLogsUseCase.name);

  constructor(
    @Inject(I_QUERY_LOGGING_REPOSITORY_TOKEN)
    private readonly queryLoggingRepository: IQueryLoggingRepository,
  ) {}

  async execute(
    input: ListQueryLogsUseCaseInput,
  ): Promise<ListQueryLogsUseCaseOutput> {
    this.logger.debug('Listing query logs', { input });

    const {
      page = 1,
      pageSize = 20,
      status,
      startDate,
      endDate,
      search,
    } = input;

    // Calculate skip for pagination using helper
    const skip = PaginationHelper.calculateSkip(page, pageSize);

    // Build base filter options (without pagination)
    const filterOptions: {
      startDate?: Date;
      endDate?: Date;
      status?: QueryStatus[];
      hasMetrics?: boolean;
      search?: string;
    } = {};

    // Add date range filter
    if (startDate) {
      filterOptions.startDate = new Date(startDate);
    }
    if (endDate) {
      filterOptions.endDate = new Date(endDate);
    }

    // Add status filter
    if (status) {
      filterOptions.status = [status];
    }

    // Add search filter
    if (search) {
      filterOptions.search = search;
    }

    // Fetch logs and total count in parallel
    const [logs, totalItems] = await Promise.all([
      this.queryLoggingRepository.findManyWithMetrics({
        ...filterOptions,
        take: pageSize,
        skip,
      }),
      this.queryLoggingRepository.countManyWithMetrics(filterOptions),
    ]);

    this.logger.debug(`Retrieved ${logs.length} logs of ${totalItems} total`);

    return {
      logs,
      totalItems,
    };
  }
}
