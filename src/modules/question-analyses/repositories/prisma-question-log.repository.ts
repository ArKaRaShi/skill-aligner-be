/**
 * Prisma-based repository implementation for question logs
 * Implements the IQuestionLogRepository contract using Prisma ORM
 */
import { Injectable } from '@nestjs/common';

import type { Identifier } from 'src/shared/contracts/types/identifier';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

import { IQuestionLogRepository } from '../contracts/repositories/i-question-log-repository.contract';
import type {
  CreateQuestionLogInput,
  FindQuestionLogsParams,
  UpdateQuestionLogInput,
} from '../contracts/repositories/types/repository-input.types';
import type { QuestionLog } from '../types';

@Injectable()
export class PrismaQuestionLogRepository implements IQuestionLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: Identifier): Promise<QuestionLog | null> {
    const questionLog = await this.prisma.questionLog.findUnique({
      where: { id },
    });

    if (!questionLog) {
      return null;
    }

    return this.mapPrismaToDomain(questionLog);
  }

  async findMany(params?: FindQuestionLogsParams): Promise<QuestionLog[]> {
    const questionLogs = await this.prisma.questionLog.findMany({
      where: {
        ...(params?.relatedProcessLogId && {
          relatedProcessLogId: params.relatedProcessLogId,
        }),
      },
      take: params?.limit,
      skip: params?.offset,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return questionLogs.map((ql) => this.mapPrismaToDomain(ql));
  }

  async create(data: CreateQuestionLogInput): Promise<QuestionLog> {
    const questionLog = await this.prisma.questionLog.create({
      data: {
        id: uuidv4(),
        questionText: data.questionText,
        role: data.role,
        metadata: data.metadata as never, // Prisma JsonValue type
        relatedProcessLogId: data.relatedProcessLogId,
      },
    });

    return this.mapPrismaToDomain(questionLog);
  }

  async update(
    id: Identifier,
    data: UpdateQuestionLogInput,
  ): Promise<QuestionLog> {
    const questionLog = await this.prisma.questionLog.update({
      where: { id },
      data: {
        ...(data.questionText !== undefined && {
          questionText: data.questionText,
        }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.metadata !== undefined && {
          metadata: data.metadata as never,
        }),
        ...(data.relatedProcessLogId !== undefined && {
          relatedProcessLogId: data.relatedProcessLogId,
        }),
      },
    });

    return this.mapPrismaToDomain(questionLog);
  }

  async delete(id: Identifier): Promise<QuestionLog> {
    const questionLog = await this.prisma.questionLog.delete({
      where: { id },
    });

    return this.mapPrismaToDomain(questionLog);
  }

  async findByProcessLogId(processLogId: Identifier): Promise<QuestionLog[]> {
    return this.findMany({ relatedProcessLogId: processLogId });
  }

  /**
   * Map Prisma model to domain model
   * Handles type casting and transforms Prisma types to domain types
   */
  private mapPrismaToDomain(prismaQuestionLog: {
    id: string;
    questionText: string;
    role: string | null;
    metadata: unknown;
    createdAt: Date;
    relatedProcessLogId: string | null;
  }): QuestionLog {
    return {
      id: prismaQuestionLog.id as Identifier,
      questionText: prismaQuestionLog.questionText,
      role: prismaQuestionLog.role,
      metadata: prismaQuestionLog.metadata as Record<string, unknown> | null,
      createdAt: prismaQuestionLog.createdAt,
      relatedProcessLogId:
        prismaQuestionLog.relatedProcessLogId as Identifier | null,
    };
  }
}
