import type { Identifier } from '../../../shared/contracts/types/identifier';
import type { StepEmbeddingConfig } from '../types/query-embedding-config.type';
import type { StepLlmConfig } from '../types/query-llm-config.type';
import type { QueryProcessStep, StepError } from '../types/query-log-step.type';
import type {
  QueryLogError,
  QueryLogInput,
  QueryLogMetrics,
  QueryLogOutput,
  QueryProcessLog,
} from '../types/query-log.type';

/**
 * Mapper for Query Logging domain ↔ Prisma conversion.
 *
 * Handles JSONB field serialization/deserialization between domain types and Prisma JsonValue.
 */
export class PrismaQueryLoggingMapper {
  /**
   * Convert Prisma QueryProcessLog to domain QueryProcessLog
   */
  static toDomainQueryProcessLog(prismaLog: {
    id: string;
    status: string;
    question: string;
    input: unknown;
    output: unknown;
    metrics: unknown;
    metadata: unknown;
    error: unknown;
    startedAt: Date;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): QueryProcessLog {
    return {
      id: prismaLog.id as Identifier,
      status: prismaLog.status as any,
      question: prismaLog.question,
      input: prismaLog.input as QueryLogInput | undefined,
      output: prismaLog.output as QueryLogOutput | undefined,
      metrics: prismaLog.metrics as QueryLogMetrics | undefined,
      metadata: prismaLog.metadata as Record<string, any> | undefined,
      error: prismaLog.error as QueryLogError | undefined,
      startedAt: prismaLog.startedAt,
      completedAt: prismaLog.completedAt ?? undefined,
      createdAt: prismaLog.createdAt,
      updatedAt: prismaLog.updatedAt,
    };
  }

  /**
   * Convert Prisma QueryProcessStep to domain QueryProcessStep
   */
  static toDomainQueryProcessStep(prismaStep: {
    id: string;
    queryLogId: string;
    stepName: string;
    stepOrder: number;
    input: unknown;
    output: unknown;
    llm: unknown;
    embedding: unknown;
    metrics: unknown;
    error: unknown;
    startedAt: Date;
    completedAt: Date | null;
    duration: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): QueryProcessStep {
    return {
      id: prismaStep.id as Identifier,
      queryLogId: prismaStep.queryLogId as Identifier,
      stepName: prismaStep.stepName as any,
      stepOrder: prismaStep.stepOrder,
      input: prismaStep.input as Record<string, any> | undefined,
      output: prismaStep.output as Record<string, any> | undefined,
      llm: prismaStep.llm as StepLlmConfig | undefined,
      embedding: prismaStep.embedding as StepEmbeddingConfig | undefined,
      metrics: prismaStep.metrics as Record<string, any> | undefined,
      error: prismaStep.error as StepError | undefined,
      startedAt: prismaStep.startedAt,
      completedAt: prismaStep.completedAt ?? undefined,
      duration: prismaStep.duration ?? undefined,
      createdAt: prismaStep.createdAt,
      updatedAt: prismaStep.updatedAt,
    };
  }

  /**
   * Convert domain QueryProcessLogWithSteps to include domain steps
   */
  static toDomainQueryProcessLogWithSteps(prismaLog: {
    id: string;
    status: string;
    question: string;
    input: unknown;
    output: unknown;
    metrics: unknown;
    metadata: unknown;
    error: unknown;
    startedAt: Date;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    processSteps: Array<{
      id: string;
      queryLogId: string;
      stepName: string;
      stepOrder: number;
      input: unknown;
      output: unknown;
      llm: unknown;
      embedding: unknown;
      metrics: unknown;
      error: unknown;
      startedAt: Date;
      completedAt: Date | null;
      duration: number | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }): any {
    return {
      ...this.toDomainQueryProcessLog(prismaLog),
      processSteps: prismaLog.processSteps.map((step) =>
        this.toDomainQueryProcessStep(step),
      ),
    };
  }
}
