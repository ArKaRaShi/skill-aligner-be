import { Injectable } from '@nestjs/common';

import { v4 as uuidv4 } from 'uuid';

import type { Identifier } from '../../../shared/contracts/types/identifier';
import { PrismaService } from '../../../shared/kernel/database/prisma.service';
import { I_QUERY_LOGGING_REPOSITORY_TOKEN } from '../contracts/i-query-logging-repository.contract';
import type { IQueryLoggingRepository } from '../contracts/i-query-logging-repository.contract';
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
import { PrismaQueryLoggingMapper } from './prisma-query-logging.mapper';

/**
 * Prisma-based repository for Query Logging.
 *
 * Implements data access for query process logs and steps using Prisma ORM.
 * JSONB fields are stored as Prisma JsonValue and mapped to domain types.
 */
@Injectable()
export class PrismaQueryLoggingRepository implements IQueryLoggingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createQueryLog(data: {
    question: string;
    input?: QueryLogInput;
  }): Promise<QueryProcessLog> {
    const prismaLog = await this.prisma.queryProcessLog.create({
      data: {
        id: uuidv4(),
        question: data.question,
        input: (data.input as any) ?? undefined,
        status: 'PENDING',
      },
    });

    return PrismaQueryLoggingMapper.toDomainQueryProcessLog(prismaLog);
  }

  async createStep(data: {
    queryLogId: Identifier;
    stepName: StepName;
    stepOrder: number;
    input?: Record<string, any>;
  }): Promise<QueryProcessStep> {
    const prismaStep = await this.prisma.queryProcessStep.create({
      data: {
        id: uuidv4(),
        queryLogId: data.queryLogId as string,
        stepName: data.stepName,
        stepOrder: data.stepOrder,
        input: data.input as any,
      },
    });

    return PrismaQueryLoggingMapper.toDomainQueryProcessStep(prismaStep);
  }

  async findStepById(stepId: Identifier): Promise<QueryProcessStep | null> {
    const prismaStep = await this.prisma.queryProcessStep.findUnique({
      where: { id: stepId as string },
    });

    if (!prismaStep) {
      return null;
    }

    return PrismaQueryLoggingMapper.toDomainQueryProcessStep(prismaStep);
  }

  async updateStep(
    stepId: Identifier,
    data: {
      completedAt?: Date;
      duration?: number;
      output?: Record<string, any>;
      llm?: StepLlmConfig;
      embedding?: StepEmbeddingConfig;
      error?: StepError;
    },
  ): Promise<QueryProcessStep> {
    const prismaStep = await this.prisma.queryProcessStep.update({
      where: { id: stepId as string },
      data: {
        completedAt: data.completedAt,
        duration: data.duration,
        output: data.output as any,
        llm: data.llm as any,
        embedding: data.embedding as any,
        error: data.error as any,
      },
    });

    return PrismaQueryLoggingMapper.toDomainQueryProcessStep(prismaStep);
  }

  async updateQueryLog(
    queryLogId: Identifier,
    data: {
      status?: QueryStatus;
      completedAt?: Date;
      output?: QueryLogOutput;
      metrics?: Partial<QueryLogMetrics>;
      error?: QueryLogError;
      // Computed scalar fields for efficient filtering
      totalDuration?: number;
      totalTokens?: number;
      totalCost?: number;
    },
  ): Promise<QueryProcessLog> {
    const prismaLog = await this.prisma.queryProcessLog.update({
      where: { id: queryLogId as string },
      data: {
        status: data.status,
        completedAt: data.completedAt,
        output: data.output as any,
        metrics: data.metrics as any,
        error: data.error as any,
        // Populate computed scalar fields
        totalDuration: data.totalDuration,
        totalTokens: data.totalTokens,
        totalCost:
          data.totalCost !== undefined ? String(data.totalCost) : undefined,
      },
    });

    return PrismaQueryLoggingMapper.toDomainQueryProcessLog(prismaLog);
  }

  async findQueryLogById(
    queryLogId: Identifier,
    includeSteps = false,
  ): Promise<QueryProcessLog | QueryProcessLogWithSteps | null> {
    const prismaLog = await this.prisma.queryProcessLog.findUnique({
      where: { id: queryLogId as string },
      include: {
        processSteps: includeSteps,
      },
    });

    if (!prismaLog) {
      return null;
    }

    if (includeSteps) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return PrismaQueryLoggingMapper.toDomainQueryProcessLogWithSteps(
        prismaLog as any,
      );
    }

    return PrismaQueryLoggingMapper.toDomainQueryProcessLog(prismaLog);
  }

  async findLastQueryLog(
    includeSteps = false,
  ): Promise<QueryProcessLog | QueryProcessLogWithSteps | null> {
    const prismaLog = await this.prisma.queryProcessLog.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        processSteps: includeSteps,
      },
    });

    if (!prismaLog) {
      return null;
    }

    if (includeSteps) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return PrismaQueryLoggingMapper.toDomainQueryProcessLogWithSteps(
        prismaLog as any,
      );
    }

    return PrismaQueryLoggingMapper.toDomainQueryProcessLog(prismaLog);
  }

  async findMany(options?: {
    take?: number;
    skip?: number;
    orderBy?: { createdAt: 'asc' | 'desc' };
  }): Promise<QueryProcessLog[]> {
    const prismaLogs = await this.prisma.queryProcessLog.findMany({
      take: options?.take,
      skip: options?.skip,
      orderBy: options?.orderBy
        ? { createdAt: options.orderBy.createdAt }
        : undefined,
    });

    return prismaLogs.map((prismaLog) =>
      PrismaQueryLoggingMapper.toDomainQueryProcessLog(prismaLog),
    );
  }

  async findManyWithMetrics(options?: {
    startDate?: Date;
    endDate?: Date;
    status?: QueryStatus[];
    hasMetrics?: boolean;
    search?: string;
    take?: number;
    skip?: number;
  }): Promise<QueryProcessLog[]> {
    const where: Record<string, unknown> = {};

    if (options?.status && options.status.length > 0) {
      where.status = { in: options.status };
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt = {
          ...(where.createdAt as object),
          gte: options.startDate,
        };
      }
      if (options.endDate) {
        where.createdAt = {
          ...(where.createdAt as object),
          lte: options.endDate,
        };
      }
    }

    if (options?.search) {
      where.question = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    if (options?.hasMetrics) {
      where.metrics = { not: null };
    }

    const prismaLogs = await this.prisma.queryProcessLog.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      take: options?.take,
      skip: options?.skip,
      orderBy: { createdAt: 'desc' },
    });

    return prismaLogs.map((prismaLog) =>
      PrismaQueryLoggingMapper.toDomainQueryProcessLog(prismaLog),
    );
  }

  async countManyWithMetrics(options?: {
    startDate?: Date;
    endDate?: Date;
    status?: QueryStatus[];
    hasMetrics?: boolean;
    search?: string;
  }): Promise<number> {
    const where: Record<string, unknown> = {};

    if (options?.status && options.status.length > 0) {
      where.status = { in: options.status };
    }

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt = {
          ...(where.createdAt as object),
          gte: options.startDate,
        };
      }
      if (options.endDate) {
        where.createdAt = {
          ...(where.createdAt as object),
          lte: options.endDate,
        };
      }
    }

    if (options?.search) {
      where.question = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    if (options?.hasMetrics) {
      where.metrics = { not: null };
    }

    return this.prisma.queryProcessLog.count({
      where: Object.keys(where).length > 0 ? where : undefined,
    });
  }
}

// Provide the token for dependency injection
export const PrismaQueryLoggingRepositoryProvider = {
  provide: I_QUERY_LOGGING_REPOSITORY_TOKEN,
  useClass: PrismaQueryLoggingRepository,
};
