import type { Identifier } from '../../../shared/contracts/types/identifier';
import type { StepEmbeddingConfig } from '../types/query-embedding-config.type';
import type { StepLlmConfig } from '../types/query-llm-config.type';
import type { QueryProcessLogWithSteps } from '../types/query-log-step.type';
import type {
  QueryLogError,
  QueryLogInput,
  QueryLogMetrics,
  QueryLogOutput,
} from '../types/query-log.type';
import type { QueryStatus, StepName } from '../types/query-status.type';

export const I_QUERY_LOGGING_SERVICE_TOKEN = Symbol('IQueryLoggingService');

/**
 * Service contract for query logging operations.
 */
export interface IQueryLoggingService {
  /**
   * Create a new query log entry
   * @param question - The user's question
   * @param input - Optional input parameters to store
   * @returns The ID of the created query log
   */
  createQueryLog(question: string, input?: QueryLogInput): Promise<Identifier>;

  /**
   * Start a new process step
   * @param queryLogId - The parent query log ID
   * @param stepName - Name of the step
   * @param stepOrder - Order of the step in the pipeline
   * @param input - Optional input data for this step
   * @returns The ID of the created step
   */
  startStep(
    queryLogId: Identifier,
    stepName: StepName,
    stepOrder: number,
    input?: Record<string, any>,
  ): Promise<Identifier>;

  /**
   * Complete a step successfully
   * Calculates duration automatically based on startedAt
   * @param stepId - The step ID
   * @param output - Optional output data from this step
   * @param llm - Optional LLM configuration and usage
   * @param embedding - Optional embedding configuration (for COURSE_RETRIEVAL step)
   */
  completeStep(
    stepId: Identifier,
    output?: Record<string, any>,
    llm?: StepLlmConfig,
    embedding?: StepEmbeddingConfig,
  ): Promise<void>;

  /**
   * Mark a step as failed
   * @param stepId - The step ID
   * @param error - Error object with code and message
   */
  failStep(stepId: Identifier, error: QueryLogError): Promise<void>;

  /**
   * Update the overall query log status
   * @param queryLogId - The query log ID
   * @param status - New status
   */
  updateQueryStatus(queryLogId: Identifier, status: QueryStatus): Promise<void>;

  /**
   * Complete a query log with final results
   * @param queryLogId - The query log ID
   * @param output - Final output (answer, courses)
   * @param metrics - Aggregated metrics (duration, tokens, cost, counts)
   */
  completeLog(
    queryLogId: Identifier,
    output: QueryLogOutput,
    metrics?: Partial<QueryLogMetrics>,
  ): Promise<void>;

  /**
   * Mark a query log as failed
   * @param queryLogId - The query log ID
   * @param error - Error information
   */
  failLog(queryLogId: Identifier, error: QueryLogError): Promise<void>;

  /**
   * Get a full query log with all steps
   * @param queryLogId - The query log ID
   * @returns Query log with steps, or null if not found
   */
  getFullQueryLogById(
    queryLogId: Identifier,
  ): Promise<QueryProcessLogWithSteps | null>;

  /**
   * Get the most recent query log
   * @returns Most recent query log with steps, or null if none exist
   */
  getLastQueryLog(): Promise<QueryProcessLogWithSteps | null>;
}
