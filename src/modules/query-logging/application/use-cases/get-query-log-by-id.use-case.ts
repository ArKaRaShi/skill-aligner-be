import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

import { Identifier } from 'src/shared/contracts/types/identifier';

import {
  I_QUERY_LOGGING_REPOSITORY_TOKEN,
  type IQueryLoggingRepository,
} from '../../contracts/i-query-logging-repository.contract';
import type { QueryProcessStep } from '../../types/query-log-step.type';
import type { QueryProcessLog } from '../../types/query-log.type';

export type GetQueryLogByIdUseCaseInput = {
  id: string;
};

export type GetQueryLogByIdUseCaseOutput = {
  log: QueryProcessLog;
  steps: QueryProcessStep[];
};

@Injectable()
export class GetQueryLogByIdUseCase {
  private readonly logger = new Logger(GetQueryLogByIdUseCase.name);

  constructor(
    @Inject(I_QUERY_LOGGING_REPOSITORY_TOKEN)
    private readonly queryLoggingRepository: IQueryLoggingRepository,
  ) {}

  async execute(
    input: GetQueryLogByIdUseCaseInput,
  ): Promise<GetQueryLogByIdUseCaseOutput> {
    this.logger.debug('Getting query log by ID', { id: input.id });

    // Fetch log with steps
    const result = await this.queryLoggingRepository.findQueryLogById(
      input.id as Identifier,
      true, // includeSteps
    );

    if (!result) {
      this.logger.warn(`Query log not found: ${input.id}`);
      throw new NotFoundException(`Query log with ID ${input.id} not found`);
    }

    // The repository returns either QueryProcessLog or QueryProcessLogWithSteps
    // We need to check if it has processSteps
    if ('processSteps' in result) {
      const logWithSteps = result;
      this.logger.debug('Retrieved log with steps', {
        stepCount: logWithSteps.processSteps.length,
      });
      return {
        log: result,
        steps: logWithSteps.processSteps,
      };
    }

    // If no steps included (shouldn't happen with includeSteps=true), return empty array
    this.logger.debug('Retrieved log without steps');
    return {
      log: result,
      steps: [],
    };
  }
}
