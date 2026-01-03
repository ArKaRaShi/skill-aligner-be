import { Identifier } from 'src/shared/domain/value-objects/identifier';

import {
  QueryProcessLogWithSteps,
  QueryStatus,
} from '../types/query-logging.type';

export const I_QUERY_LOGGING_SERVICE = Symbol('IQueryLoggingService');

export interface IQueryLoggingService {
  /**
   * Create a new query log entry
   * @param question - The user question to log
   * @returns The identifier of created query log
   */
  createQueryLog(question: string): Promise<Identifier>;

  /**
   * Start a new process step
   * @param queryLogId - The identifier of query log
   * @param stepName - The name of step to start
   * @param stepOrder - The order of step in process
   * @param input - The input data for step
   * @returns The identifier of started process step
   */
  startStep(
    queryLogId: Identifier,
    stepName: string,
    stepOrder: number,
    input?: Record<string, unknown> | null,
  ): Promise<Identifier>;

  /**
   * Complete a process step
   * @param queryStepId - The identifier of query step
   * @param output - The output of the completed step
   * @param metadata - Additional metadata related to step
   */
  completeStep(
    queryStepId: Identifier,
    output?: Record<string, unknown> | null,
    metadata?: Record<string, unknown> | null,
  ): Promise<void>;

  /**
   * Fail a process step
   * @param queryStepId - The identifier of query step
   * @param errorMessage - The error message associated with the failure
   * @param metadata - Additional metadata related to the failure
   */
  failStep(
    queryStepId: Identifier,
    errorMessage: string,
    metadata?: Record<string, unknown> | null,
  ): Promise<void>;

  /**
   * Update the status of a query log
   * @param queryLogId - The identifier of the query log
   * @param status - The new status to set
   */
  updateQueryStatus(queryLogId: Identifier, status: QueryStatus): Promise<void>;

  /**
   * Retrieve the full query log with all steps by ID
   * @param queryLogId - The identifier of the query log to retrieve
   * @returns The complete query log including all process steps
   */
  getFullQueryLogById(
    queryLogId: Identifier,
  ): Promise<QueryProcessLogWithSteps | null>;

  /**
   * Retrieve the most recent query log with all steps
   * @returns The most recent complete query log including all process steps, or null if none exist
   */
  getLastQueryLog(): Promise<QueryProcessLogWithSteps | null>;
}
