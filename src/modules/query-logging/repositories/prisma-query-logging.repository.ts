import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';
import { Identifier } from 'src/common/domain/types/identifier';

import { IQueryLoggingRepository } from '../contracts/i-query-logging-repository.contract';
import {
  QueryProcessLog,
  QueryProcessLogWithSteps,
  QueryProcessStep,
  QueryStatus,
} from '../types/query-logging.type';
import { PrismaQueryLoggingMapper } from './prisma-query-logging.mapper';

@Injectable()
export class PrismaQueryLoggingRepository implements IQueryLoggingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(query: { question: string }): Promise<QueryProcessLog> {
    const created = await this.prisma.queryProcessLog.create({
      data: {
        id: uuidv4(),
        question: query.question,
      },
    });

    return PrismaQueryLoggingMapper.toDomainQueryLog(created);
  }

  async createStep(step: {
    queryLogId: string;
    stepName: string;
    stepOrder: number;
    startedAt: Date;
    input?: Record<string, unknown> | null;
  }): Promise<QueryProcessStep> {
    const created = await this.prisma.queryProcessStep.create({
      data: {
        id: uuidv4(),
        queryLogId: step.queryLogId,
        stepName: step.stepName,
        stepOrder: step.stepOrder,
        startedAt: step.startedAt,
        input: step.input as Prisma.JsonObject,
      },
    });

    return PrismaQueryLoggingMapper.toDomainQueryStep(created);
  }

  async updateStep(
    id: string,
    data: {
      completedAt?: Date;
      duration?: number;
      output?: Record<string, unknown> | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<QueryProcessStep> {
    const updated = await this.prisma.queryProcessStep.update({
      where: { id },
      data: {
        completedAt: data.completedAt,
        duration: data.duration,
        output: data.output as Prisma.JsonObject,
        metadata: data.metadata as Prisma.JsonObject,
      },
    });

    return PrismaQueryLoggingMapper.toDomainQueryStep(updated);
  }

  async updateStatus(
    id: Identifier,
    status: QueryStatus,
  ): Promise<QueryProcessLog> {
    const updated = await this.prisma.queryProcessLog.update({
      where: { id },
      data: { status },
    });

    return PrismaQueryLoggingMapper.toDomainQueryLog(updated);
  }

  async findById(
    id: Identifier,
    options?: { includeSteps?: boolean },
  ): Promise<QueryProcessLogWithSteps | null> {
    const queryLogWithSteps = await this.prisma.queryProcessLog.findUnique({
      where: { id },
      include: {
        processSteps: options?.includeSteps ?? false,
      },
    });

    if (!queryLogWithSteps) {
      return null;
    }

    return PrismaQueryLoggingMapper.toDomainQueryLogWithSteps(
      queryLogWithSteps,
    );
  }

  async findLatest(options?: {
    includeSteps?: boolean;
  }): Promise<QueryProcessLogWithSteps | null> {
    const queryLogWithSteps = await this.prisma.queryProcessLog.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        processSteps: options?.includeSteps ?? false,
      },
    });

    if (!queryLogWithSteps) {
      return null;
    }

    return PrismaQueryLoggingMapper.toDomainQueryLogWithSteps(
      queryLogWithSteps,
    );
  }

  async findStepById(id: Identifier): Promise<QueryProcessStep | null> {
    const queryStep = await this.prisma.queryProcessStep.findUnique({
      where: { id },
    });

    if (!queryStep) {
      return null;
    }

    return PrismaQueryLoggingMapper.toDomainQueryStep(queryStep);
  }
}
