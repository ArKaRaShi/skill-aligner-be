import type { Identifier } from '../../../shared/contracts/types/identifier';
import type { StepEmbeddingConfig } from '../types/query-embedding-config.type';
import type { StepLlmConfig } from '../types/query-llm-config.type';
import type {
  QueryProcessLogWithSteps,
  QueryProcessStep,
  StepError,
} from '../types/query-log-step.type';
import type {
  QueryLogError,
  QueryLogInput,
  QueryLogMetrics,
  QueryLogOutput,
  QueryProcessLog,
} from '../types/query-log.type';
import type { QueryStatus, StepName } from '../types/query-status.type';

export const I_QUERY_LOGGING_REPOSITORY_TOKEN = Symbol(
  'IQueryLoggingRepository',
);

/**
 * Repository contract for query logging data access.
 */
export interface IQueryLoggingRepository {
  /**
   * Create a new query log entry
   * @param data - The query log data
   * @returns The created query log
   */
  createQueryLog(data: {
    question: string;
    input?: QueryLogInput;
  }): Promise<QueryProcessLog>;

  /**
   * Create a new process step
   * @param data - The step data
   * @returns The created step
   */
  createStep(data: {
    queryLogId: Identifier;
    stepName: StepName;
    stepOrder: number;
    input?: Record<string, any>;
  }): Promise<QueryProcessStep>;

  /**
   * Find a step by ID
   * @param stepId - The step ID
   * @returns The step, or null if not found
   */
  findStepById(stepId: Identifier): Promise<QueryProcessStep | null>;

  /**
   * Update a step with completion data
   * @param stepId - The step ID
   * @param data - The update data
   * @returns The updated step
   */
  updateStep(
    stepId: Identifier,
    data: {
      completedAt?: Date;
      duration?: number;
      output?: Record<string, any>;
      llm?: StepLlmConfig;
      embedding?: StepEmbeddingConfig;
      error?: StepError;
    },
  ): Promise<QueryProcessStep>;

  /**
   * Update a query log
   * @param queryLogId - The query log ID
   * @param data - The update data
   * @returns The updated query log
   */
  updateQueryLog(
    queryLogId: Identifier,
    data: {
      status?: QueryStatus;
      completedAt?: Date;
      output?: QueryLogOutput;
      metrics?: Partial<QueryLogMetrics>;
      error?: QueryLogError;
    },
  ): Promise<QueryProcessLog>;

  /**
   * Find a query log by ID
   * @param queryLogId - The query log ID
   * @param includeSteps - Whether to include related steps
   * @returns The query log, or null if not found
   */
  findQueryLogById(
    queryLogId: Identifier,
    includeSteps?: boolean,
  ): Promise<QueryProcessLog | QueryProcessLogWithSteps | null>;

  /**
   * Find the last query log
   * @param includeSteps - Whether to include related steps
   * @returns The last query log, or null if none exist
   */
  findLastQueryLog(
    includeSteps?: boolean,
  ): Promise<QueryProcessLog | QueryProcessLogWithSteps | null>;

  /**
   * Find multiple query logs
   * @param options - Query options
   * @returns Array of query logs
   */
  findMany(options?: {
    take?: number;
    skip?: number;
    orderBy?: { createdAt: 'asc' | 'desc' };
  }): Promise<QueryProcessLog[]>;

  /**
   * Find query logs with metrics filtering options
   * @param options - Filter options for querying logs with metrics
   * @returns Array of query logs
   */
  findManyWithMetrics(options?: {
    startDate?: Date;
    endDate?: Date;
    status?: QueryStatus[];
    hasMetrics?: boolean;
    take?: number;
    skip?: number;
  }): Promise<QueryProcessLog[]>;
}
