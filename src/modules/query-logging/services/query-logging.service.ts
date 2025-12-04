import { Inject, Injectable } from '@nestjs/common';

import { Identifier } from 'src/common/domain/types/identifier';

import {
  I_QUERY_LOGGING_REPOSITORY,
  IQueryLoggingRepository,
} from '../contracts/i-query-logging-repository.contract';
import { IQueryLoggingService } from '../contracts/i-query-logging-service.contract';
import {
  QueryProcessLogWithSteps,
  QueryStatus,
} from '../types/query-logging.type';

@Injectable()
export class QueryLoggingService implements IQueryLoggingService {
  constructor(
    @Inject(I_QUERY_LOGGING_REPOSITORY)
    private readonly queryLoggingRepository: IQueryLoggingRepository,
  ) {}

  async createQueryLog(question: string): Promise<Identifier> {
    const created = await this.queryLoggingRepository.create({
      question,
    });

    return created.id;
  }

  async startStep(
    queryLogId: Identifier,
    stepName: string,
    stepOrder: number,
    input?: Record<string, unknown> | null,
  ): Promise<Identifier> {
    const created = await this.queryLoggingRepository.createStep({
      queryLogId,
      stepName,
      stepOrder,
      startedAt: new Date(),
      input,
    });

    return created.id;
  }

  async completeStep(
    queryStepId: Identifier,
    output?: Record<string, unknown> | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    const completedAt = new Date();
    const startedStep =
      await this.queryLoggingRepository.findStepById(queryStepId);

    if (!startedStep) {
      throw new Error(`Query step not found: ${queryStepId}`);
    }

    const duration = completedAt.getTime() - startedStep.startedAt.getTime();

    await this.queryLoggingRepository.updateStep(queryStepId, {
      completedAt,
      duration,
      output,
      metadata,
    });
  }

  async failStep(
    queryStepId: Identifier,
    errorMessage: string,
    metadata?: Record<string, unknown> | null,
  ): Promise<void> {
    const completedAt = new Date();
    const startedStep =
      await this.queryLoggingRepository.findStepById(queryStepId);

    if (!startedStep) {
      throw new Error(`Query step not found: ${queryStepId}`);
    }

    const duration = completedAt.getTime() - startedStep.startedAt.getTime();

    await this.queryLoggingRepository.updateStep(queryStepId, {
      completedAt,
      duration,
      metadata: {
        ...metadata,
        errorMessage,
      },
    });
  }

  async updateQueryStatus(
    queryLogId: Identifier,
    status: QueryStatus,
  ): Promise<void> {
    await this.queryLoggingRepository.updateStatus(queryLogId, status);
  }

  async getFullQueryLogById(
    queryLogId: Identifier,
  ): Promise<QueryProcessLogWithSteps | null> {
    return await this.queryLoggingRepository.findById(queryLogId, {
      includeSteps: true,
    });
  }

  async getLastQueryLog(): Promise<QueryProcessLogWithSteps | null> {
    return await this.queryLoggingRepository.findLatest({
      includeSteps: true,
    });
  }
}
