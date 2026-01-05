import type { Identifier } from '../../../shared/contracts/types/identifier';
import type { StepEmbeddingConfig } from './query-embedding-config.type';
import type { StepLlmConfig } from './query-llm-config.type';
import type { QueryProcessLog } from './query-log.type';
import type { StepName } from './query-status.type';

/**
 * Domain type for query process step.
 */
export interface QueryProcessStep {
  id: Identifier;
  queryLogId: Identifier;
  stepName: StepName;
  stepOrder: number;

  // Flexible JSONB fields
  input?: Record<string, any>;
  output?: Record<string, any>;
  llm?: StepLlmConfig; // For LLM steps
  embedding?: StepEmbeddingConfig; // For COURSE_RETRIEVAL step
  metrics?: StepMetrics;
  error?: StepError;

  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Metrics stored in QueryProcessStep.metrics
 */
export interface StepMetrics {
  duration?: number;
}

/**
 * Error info stored in QueryProcessStep.error
 */
export interface StepError {
  code?: string;
  message: string;
  details?: any;
}

/**
 * Composite type for log with steps.
 */
export interface QueryProcessLogWithSteps extends QueryProcessLog {
  processSteps: QueryProcessStep[];
}
