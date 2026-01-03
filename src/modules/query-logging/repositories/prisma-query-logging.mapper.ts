import {
  QueryProcessLog as PrismaQueryProcessLog,
  QueryProcessStep as PrismaQueryProcessStep,
} from '@prisma/client';

import { Identifier } from 'src/shared/contracts/types/identifier';

import {
  QueryProcessLog,
  QueryProcessLogWithSteps,
  QueryProcessStep,
  QueryStatus,
} from '../types/query-logging.type';

export class PrismaQueryLoggingMapper {
  static toDomainQueryLog(
    prismaQueryLog: PrismaQueryProcessLog,
  ): QueryProcessLog {
    return {
      id: prismaQueryLog.id as Identifier,
      question: prismaQueryLog.question,
      status: prismaQueryLog.status as QueryStatus,
      createdAt: prismaQueryLog.createdAt,
      updatedAt: prismaQueryLog.updatedAt,
    };
  }

  static toDomainQueryStep(
    prismaQueryStep: PrismaQueryProcessStep,
  ): QueryProcessStep {
    return {
      id: prismaQueryStep.id as Identifier,
      queryLogId: prismaQueryStep.queryLogId as Identifier,
      stepName: prismaQueryStep.stepName,
      stepOrder: prismaQueryStep.stepOrder,
      startedAt: prismaQueryStep.startedAt,
      completedAt: prismaQueryStep.completedAt,
      duration: prismaQueryStep.duration,
      input: prismaQueryStep.input as Record<string, unknown> | null,
      output: prismaQueryStep.output as Record<string, unknown> | null,
      metadata: prismaQueryStep.metadata as Record<string, unknown> | null,
      createdAt: prismaQueryStep.createdAt,
      updatedAt: prismaQueryStep.updatedAt,
    };
  }

  static toDomainQueryLogWithSteps(
    prismaQueryLog: PrismaQueryProcessLog & {
      processSteps?: PrismaQueryProcessStep[];
    },
  ): QueryProcessLogWithSteps {
    const queryLog = PrismaQueryLoggingMapper.toDomainQueryLog(prismaQueryLog);

    return {
      ...queryLog,
      processSteps:
        prismaQueryLog.processSteps?.map((step) =>
          PrismaQueryLoggingMapper.toDomainQueryStep(step),
        ) ?? [],
    };
  }
}
