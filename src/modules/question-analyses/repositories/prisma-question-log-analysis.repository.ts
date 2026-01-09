/**
 * Prisma-based repository implementation for question log analyses
 * Implements the IQuestionLogAnalysisRepository contract using Prisma ORM
 */
import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import type { Identifier } from 'src/shared/contracts/types/identifier';
import type { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { PrismaGlobalMapper } from 'src/shared/kernel/database/mappers/prisma-global.mapper';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

import { IQuestionLogAnalysisRepository } from '../contracts/repositories/i-question-log-analysis-repository.contract';
import type {
  CreateQuestionLogAnalysisInput,
  FindAnalysesParams,
} from '../contracts/repositories/types/repository-input.types';
import type {
  ConfidenceLevel,
  EntityType,
  ExtractionQuality,
  ExtractionSource,
} from '../types/core.enums';
import type { QuestionLogAnalysis } from '../types/domain.types';
import type { EntityCounts } from '../types/entity-types';

// Type for Prisma model with entities relation included
type QuestionLogAnalysisWithEntities = Prisma.QuestionLogAnalysisGetPayload<{
  include: { entities: true };
}>;

@Injectable()
export class PrismaQuestionLogAnalysisRepository
  implements IQuestionLogAnalysisRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateQuestionLogAnalysisInput,
  ): Promise<QuestionLogAnalysis> {
    const analysisId = uuidv4() as Identifier;

    const analysis = await this.prisma.questionLogAnalysis.create({
      data: {
        id: analysisId as string,
        questionLogId: data.questionLogId,
        extractionVersion: data.extractionVersion,
        extractionNumber: data.extractionNumber,
        modelUsed: data.modelUsed,
        extractedAt: new Date(),
        overallQuality: data.overallQuality,
        entityCounts: data.entityCounts,
        extractionCost: data.extractionCost,
        tokensUsed: data.tokensUsed,
        reasoning: data.reasoning,

        llm: data.llm ?? Prisma.JsonNull,
        entities: {
          create: data.entities.map((entity) => ({
            id: uuidv4(),
            type: entity.type,
            name: entity.name,
            normalizedLabel: entity.normalizedLabel,
            confidence: entity.confidence,
            source: entity.source,
          })),
        },
      },
      include: {
        entities: true,
      },
    });

    return this.mapPrismaAnalysisToDomain(analysis);
  }

  async findMany(params?: FindAnalysesParams): Promise<QuestionLogAnalysis[]> {
    const analyses = await this.prisma.questionLogAnalysis.findMany({
      where: {
        ...(params?.questionLogId && { questionLogId: params.questionLogId }),
        ...(params?.extractionVersion && {
          extractionVersion: params.extractionVersion,
        }),
      },
      take: params?.limit,
      include: {
        entities: true,
      },
      orderBy: {
        extractedAt: 'desc',
      },
    });

    return analyses.map((a) => this.mapPrismaAnalysisToDomain(a));
  }

  async findById(id: Identifier): Promise<QuestionLogAnalysis | null> {
    const analysis = await this.prisma.questionLogAnalysis.findUnique({
      where: { id: id as string },
      include: {
        entities: true,
      },
    });

    if (!analysis) {
      return null;
    }

    return this.mapPrismaAnalysisToDomain(analysis);
  }

  async findByQuestionLogId(
    questionLogId: Identifier,
  ): Promise<QuestionLogAnalysis[]> {
    const analyses = await this.prisma.questionLogAnalysis.findMany({
      where: {
        questionLogId: questionLogId as string,
      },
      include: {
        entities: true,
      },
      orderBy: {
        extractedAt: 'desc',
      },
    });

    return analyses.map((a) => this.mapPrismaAnalysisToDomain(a));
  }

  async getNextExtractionNumber(
    questionLogId: Identifier,
    extractionVersion: string,
  ): Promise<number> {
    const lastAnalysis = await this.prisma.questionLogAnalysis.findFirst({
      where: {
        questionLogId: questionLogId as string,
        extractionVersion: extractionVersion,
      },
      orderBy: {
        extractionNumber: 'desc',
      },
    });

    return lastAnalysis ? lastAnalysis.extractionNumber + 1 : 1;
  }

  /**
   * Map Prisma model to domain model
   * Handles type casting and transforms Prisma types to domain types
   */
  private mapPrismaAnalysisToDomain(
    prismaAnalysis: QuestionLogAnalysisWithEntities,
  ): QuestionLogAnalysis {
    const entities = prismaAnalysis.entities.map((e) => ({
      id: e.id as Identifier,
      analysisId: e.analysisId as Identifier,
      type: e.type as EntityType,
      name: e.name,
      normalizedLabel: e.normalizedLabel,
      confidence: e.confidence as ConfidenceLevel,
      source: e.source as ExtractionSource,
      createdAt: e.createdAt,
    }));

    return {
      id: prismaAnalysis.id as Identifier,
      questionLogId: prismaAnalysis.questionLogId as Identifier,
      extractionVersion: prismaAnalysis.extractionVersion,
      extractionNumber: prismaAnalysis.extractionNumber,
      modelUsed: prismaAnalysis.modelUsed,
      extractedAt: prismaAnalysis.extractedAt,
      overallQuality: prismaAnalysis.overallQuality as ExtractionQuality,
      entityCounts: prismaAnalysis.entityCounts as EntityCounts | null,
      extractionCost: Number(prismaAnalysis.extractionCost),
      tokensUsed: prismaAnalysis.tokensUsed,
      reasoning: prismaAnalysis.reasoning,

      llm: PrismaGlobalMapper.mapPrismaMetadataToDomain(
        prismaAnalysis.llm as Prisma.JsonObject | null,
      ) as LlmInfo | null,
      createdAt: prismaAnalysis.createdAt,
      entities,
    };
  }
}
