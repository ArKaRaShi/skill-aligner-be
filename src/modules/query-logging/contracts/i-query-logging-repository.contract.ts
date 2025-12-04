import { Identifier } from 'src/common/domain/types/identifier';

import {
  QueryProcessLog,
  QueryProcessLogWithSteps,
  QueryProcessStep,
} from '../types/query-logging.type';

export const I_QUERY_LOGGING_REPOSITORY = Symbol('IQueryLoggingRepository');

export interface IQueryLoggingRepository {
  /**
   * Create a new query process log
   * @param question - The user question to log
   * @returns The created query process log
   */
  create(query: { question: string }): Promise<QueryProcessLog>;

  /**
   * Create a new query process step
   *
   * queryLogId must exist before creating step
   *
   * @param step - The step data to create
   * @returns The created query process step
   */
  createStep(step: {
    queryLogId: Identifier;
    stepName: string;
    stepOrder: number;
    startedAt: Date;
    input?: Record<string, unknown> | null;
  }): Promise<QueryProcessStep>;

  /**
   * Update a query process step
   * @param id - The step ID to update
   * @param data - The data to update
   * @returns The updated query process step
   */
  updateStep(
    id: Identifier,
    data: {
      completedAt?: Date;
      duration?: number;
      output?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<QueryProcessStep>;

  /**
   * Update query process log status
   * @param id - The query log ID to update
   * @param status - The new status
   * @returns The updated query process log
   */
  updateStatus(
    id: Identifier,
    status: 'PENDING' | 'COMPLETED' | 'FAILED',
  ): Promise<QueryProcessLog>;

  /**
   * Find query process log by ID with optional steps inclusion
   * @param id - The query log ID to find
   * @param options - Options to include related steps
   * @returns The query process log with steps if requested
   */
  findById(
    id: Identifier,
    options?: { includeSteps?: boolean },
  ): Promise<QueryProcessLogWithSteps | null>;

  /**
   * Find most recent query process log
   * @param options - Options to include related steps
   * @returns The most recent query process log with steps if requested
   */
  findLatest(options?: {
    includeSteps?: boolean;
  }): Promise<QueryProcessLogWithSteps | null>;

  /**
   * Find a query process step by ID
   * @param id - The step ID to find
   * @returns The query process step, or null if not found
   */
  findStepById(id: Identifier): Promise<QueryProcessStep | null>;
}
