import { Inject, Injectable, Logger } from '@nestjs/common';

import { Identifier } from 'src/shared/contracts/types/identifier';
import { AppException } from 'src/shared/kernel/exception/app-exception';
import { ErrorCode } from 'src/shared/kernel/exception/exception.constant';

import {
  I_QUERY_LOGGING_REPOSITORY_TOKEN,
  type IQueryLoggingRepository,
} from '../../contracts/i-query-logging-repository.contract';

export type DeleteQueryLogByIdUseCaseInput = {
  id: string;
};

export type DeleteQueryLogByIdUseCaseOutput = void;

@Injectable()
export class DeleteQueryLogByIdUseCase {
  private readonly logger = new Logger(DeleteQueryLogByIdUseCase.name);

  constructor(
    @Inject(I_QUERY_LOGGING_REPOSITORY_TOKEN)
    private readonly queryLoggingRepository: IQueryLoggingRepository,
  ) {}

  async execute(
    input: DeleteQueryLogByIdUseCaseInput,
  ): Promise<DeleteQueryLogByIdUseCaseOutput> {
    this.logger.debug('Deleting query log by ID', { id: input.id });

    // First check if the log exists
    const log = await this.queryLoggingRepository.findQueryLogById(
      input.id as Identifier,
      false, // don't need steps for delete
    );

    if (!log) {
      this.logger.warn(`Query log not found for deletion: ${input.id}`);
      throw new AppException({
        message: `Query log with ID ${input.id} not found`,
        errorCode: ErrorCode.RESOURCE_NOT_FOUND,
        context: { id: input.id },
      });
    }

    // Delete the log (cascade delete will handle steps)
    await this.queryLoggingRepository.deleteQueryLogById(
      input.id as Identifier,
    );

    this.logger.debug(`Query log deleted successfully: ${input.id}`);
  }
}
