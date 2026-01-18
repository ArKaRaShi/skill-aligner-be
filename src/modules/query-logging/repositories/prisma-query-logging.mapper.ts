import { Prisma } from '@prisma/client';

import type { Identifier } from '../../../shared/contracts/types/identifier';
import { PrismaGlobalMapper } from '../../../shared/kernel/database/mappers/prisma-global.mapper';
import type { StepEmbeddingConfig } from '../types/query-embedding-config.type';
import type { StepLlmConfig } from '../types/query-llm-config.type';
import type {
  QueryProcessStep,
  QueryProcessStepOutput,
  StepError,
  StepMetrics,
} from '../types/query-log-step.type';
import type {
  QueryLogError,
  QueryLogInput,
  QueryLogMetrics,
  QueryLogOutput,
  QueryProcessLog,
} from '../types/query-log.type';

/**
 * Prisma type aliases for type-safe mapping.
 *
 * Using Prisma.ModelGetPayload ensures:
 * - Auto-generated types from schema (no manual maintenance)
 * - Full IDE auto-complete and type checking
 * - Single source of truth (DRY principle)
 */
type PrismaQueryProcessLog = Prisma.QueryProcessLogGetPayload<object>;
type PrismaQueryProcessLogWithSteps = Prisma.QueryProcessLogGetPayload<{
  include: { processSteps: true };
}>;
type PrismaQueryProcessStep = Prisma.QueryProcessStepGetPayload<object>;

/**
 * Mapper for Query Logging domain ↔ Prisma conversion.
 *
 * Handles JSONB field serialization/deserialization between domain types and Prisma JsonValue.
 */
export class PrismaQueryLoggingMapper {
  /**
   * Convert Prisma QueryProcessLog to domain QueryProcessLog
   */
  static toDomainQueryProcessLog(
    prismaLog: PrismaQueryProcessLog,
  ): QueryProcessLog {
    return {
      id: prismaLog.id as Identifier,
      status: prismaLog.status as any,
      question: prismaLog.question,
      input: PrismaGlobalMapper.jsonToDomain<QueryLogInput>(prismaLog.input),
      output: PrismaGlobalMapper.jsonToDomain<QueryLogOutput>(prismaLog.output),
      metrics: PrismaGlobalMapper.jsonToDomain<QueryLogMetrics>(
        prismaLog.metrics,
      ),
      metadata: PrismaGlobalMapper.jsonToDomain<Record<string, any>>(
        prismaLog.metadata,
      ),
      error: PrismaGlobalMapper.jsonToDomain<QueryLogError>(prismaLog.error),
      totalDuration: prismaLog.totalDuration,
      totalTokens: prismaLog.totalTokens,
      totalCost: PrismaGlobalMapper.decimalToNumber(prismaLog.totalCost),
      startedAt: prismaLog.startedAt,
      completedAt: prismaLog.completedAt,
      createdAt: prismaLog.createdAt,
      updatedAt: prismaLog.updatedAt,
    };
  }

  /**
   * Convert Prisma QueryProcessStep to domain QueryProcessStep
   */
  static toDomainQueryProcessStep(
    prismaStep: PrismaQueryProcessStep,
  ): QueryProcessStep {
    return {
      id: prismaStep.id as Identifier,
      queryLogId: prismaStep.queryLogId as Identifier,
      stepName: prismaStep.stepName as any,
      stepOrder: prismaStep.stepOrder,
      input: PrismaGlobalMapper.jsonToDomain<Record<string, any>>(
        prismaStep.input,
      ),
      output: PrismaGlobalMapper.jsonToDomain<QueryProcessStepOutput>(
        prismaStep.output,
      ), // JSONB data - already serialized (Maps → Objects)
      llm: PrismaGlobalMapper.jsonToDomain<StepLlmConfig>(prismaStep.llm),
      embedding: PrismaGlobalMapper.jsonToDomain<StepEmbeddingConfig>(
        prismaStep.embedding,
      ),
      metrics: PrismaGlobalMapper.jsonToDomain<StepMetrics>(prismaStep.metrics),
      error: PrismaGlobalMapper.jsonToDomain<StepError>(prismaStep.error),
      startedAt: prismaStep.startedAt,
      completedAt: prismaStep.completedAt,
      duration: prismaStep.duration,
      createdAt: prismaStep.createdAt,
      updatedAt: prismaStep.updatedAt,
    };
  }

  /**
   * Convert Prisma QueryProcessLogWithSteps to domain QueryProcessLogWithSteps
   */
  static toDomainQueryProcessLogWithSteps(
    prismaLog: PrismaQueryProcessLogWithSteps,
  ): any {
    return {
      ...this.toDomainQueryProcessLog(prismaLog),
      processSteps: prismaLog.processSteps.map((step) =>
        this.toDomainQueryProcessStep(step),
      ),
    };
  }
}
