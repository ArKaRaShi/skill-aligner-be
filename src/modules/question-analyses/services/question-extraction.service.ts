/**
 * Question Extraction Service
 *
 * Handles entity extraction from user questions using LLM.
 * Orchestrates the extraction workflow: fetch question log, call LLM, store results.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import type { Identifier } from 'src/shared/contracts/types/identifier';
import type { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

import {
  I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN,
  IQuestionLogAnalysisRepository,
} from '../contracts/repositories/i-question-log-analysis-repository.contract';
import type {
  CreateExtractedEntityInput,
  CreateQuestionLogAnalysisInput,
} from '../contracts/repositories/types/repository-input.types';
import type { IQuestionExtractionService } from '../contracts/services/i-question-extraction-service.contract';
import type { ExtractFromQuestionInput } from '../contracts/services/types/service-input.types';
import {
  ENTITY_EXTRACTION_SYSTEM_PROMPT,
  EntityExtractionSchema,
  getEntityExtractionUserPrompt,
} from '../prompts/entity-extraction.prompt';
import type { EntityType } from '../types/core.enums';
import type {
  ExtractionHistoryEntry,
  ExtractionResult,
} from '../types/extraction.types';

/**
 * Question Extraction Service Implementation
 *
 * Workflow:
 * 1. Fetch question log by ID
 * 2. Get next extraction number (auto-increment per version)
 * 3. Call LLM with extraction prompt
 * 4. Calculate entity counts
 * 5. Store analysis with entities in database
 */
@Injectable()
export class QuestionExtractionService implements IQuestionExtractionService {
  private readonly logger = new Logger(QuestionExtractionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN)
    private readonly repository: IQuestionLogAnalysisRepository,
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouter: ILlmRouterService,
  ) {}

  async extractFromQuestion(
    input: ExtractFromQuestionInput,
  ): Promise<ExtractionResult> {
    const { questionLogId, extractionVersion, model } = input;

    this.logger.debug(
      `Starting extraction for question log ${questionLogId} (version: ${extractionVersion})`,
    );

    // 1. Fetch question log
    const questionLog = await this.prisma.questionLog.findUnique({
      where: { id: questionLogId },
    });

    if (!questionLog) {
      throw new Error(
        `Question log with id ${questionLogId} not found. Cannot proceed with extraction.`,
      );
    }

    // 2. Get next extraction number
    const extractionNumber = await this.repository.getNextExtractionNumber(
      questionLogId as Identifier,
      extractionVersion,
    );

    this.logger.debug(
      `Extraction number for version ${extractionVersion}: ${extractionNumber}`,
    );

    // 3. Call LLM for extraction
    const startTime = Date.now();

    const llmResult = await this.llmRouter.generateObject({
      prompt: getEntityExtractionUserPrompt(questionLog.questionText),
      systemPrompt: ENTITY_EXTRACTION_SYSTEM_PROMPT,
      schema: EntityExtractionSchema,
      model: model ?? 'gpt-4.1-mini',
    });

    const duration = Date.now() - startTime;

    const extractionData = llmResult.object;

    this.logger.debug(
      `LLM extraction completed in ${duration}ms. Quality: ${extractionData.overallQuality}`,
    );

    // 4. Transform LLM output to repository input
    const entities: CreateExtractedEntityInput[] = [
      ...this.mapEntities(extractionData.mentionTopics ?? [], 'topic'),
      ...this.mapEntities(extractionData.mentionSkills ?? [], 'skill'),
      ...this.mapEntities(extractionData.mentionTasks ?? [], 'task'),
      ...this.mapEntities(extractionData.mentionRoles ?? [], 'role'),
    ];

    const entityCounts = {
      topics: extractionData.mentionTopics?.length ?? 0,
      skills: extractionData.mentionSkills?.length ?? 0,
      tasks: extractionData.mentionTasks?.length ?? 0,
      roles: extractionData.mentionRoles?.length ?? 0,
    };

    // Build LlmInfo from LLM response
    const llmInfo: LlmInfo = {
      model: llmResult.model,
      provider: llmResult.provider,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
      systemPrompt: ENTITY_EXTRACTION_SYSTEM_PROMPT,
      userPrompt: getEntityExtractionUserPrompt(questionLog.questionText),
      promptVersion: 'v1',
      schemaName: 'EntityExtractionSchema',
      finishReason: llmResult.finishReason,
      warnings: llmResult.warnings,
      providerMetadata: llmResult.providerMetadata,
      response: llmResult.response,
      hyperParameters: llmResult.hyperParameters,
    };

    const analysisInput: CreateQuestionLogAnalysisInput = {
      questionLogId: questionLogId,
      extractionVersion,
      extractionNumber,
      modelUsed: llmInfo.model,
      overallQuality: extractionData.overallQuality,
      entityCounts,
      extractionCost: 0, // Will be calculated by TokenCostCalculator if needed
      tokensUsed: (llmInfo.inputTokens ?? 0) + (llmInfo.outputTokens ?? 0),
      reasoning: extractionData.reasoning,
      llm: llmInfo,
      entities,
    };

    // 5. Store analysis
    const analysis = await this.repository.create(analysisInput);

    this.logger.log(
      `Extraction ${extractionNumber} (v${extractionVersion}) created for question log ${questionLogId} with ${entities.length} entities`,
    );

    // 6. Map to ExtractionResult
    return {
      analysis: {
        id: analysis.id,
        questionLogId: analysis.questionLogId,
        extractionVersion: analysis.extractionVersion,
        extractionNumber: analysis.extractionNumber,
        modelUsed: analysis.modelUsed,
        extractedAt: analysis.extractedAt,
        overallQuality: analysis.overallQuality,
        entityCounts: analysis.entityCounts ?? {
          topics: 0,
          skills: 0,
          tasks: 0,
          roles: 0,
        },
        extractionCost: analysis.extractionCost,
        tokensUsed: analysis.tokensUsed,
        reasoning: analysis.reasoning,
        llm: analysis.llm,
        createdAt: analysis.createdAt,
      },
      entities: analysis.entities.map((e) => ({
        type: e.type,
        name: e.name,
        normalizedLabel: e.normalizedLabel,
        confidence: e.confidence,
        source: e.source,
      })),
    };
  }

  async getExtractionHistory(
    questionLogId: Identifier,
  ): Promise<ExtractionHistoryEntry[]> {
    this.logger.debug(`Fetching extraction history for ${questionLogId}`);

    const analyses = await this.repository.findByQuestionLogId(questionLogId);

    return analyses.map(
      (analysis): ExtractionHistoryEntry => ({
        extractionVersion: analysis.extractionVersion,
        extractionNumber: analysis.extractionNumber,
        modelUsed: analysis.modelUsed,
        extractedAt: analysis.extractedAt,
        overallQuality: analysis.overallQuality,
        entityCounts: analysis.entityCounts ?? {
          topics: 0,
          skills: 0,
          tasks: 0,
          roles: 0,
        },
        extractionCost: analysis.extractionCost,
        tokensUsed: analysis.tokensUsed,
      }),
    );
  }

  /**
   * Map LLM entity output to repository input format
   * @private
   */
  private mapEntities(
    entities: Array<{
      name: string;
      normalizedLabel: string;
      confidence: 'HIGH' | 'MEDIUM' | 'LOW';
      source: 'explicit' | 'inferred';
    }>,
    type: EntityType,
  ): CreateExtractedEntityInput[] {
    return entities.map((entity) => ({
      type,
      name: entity.name,
      normalizedLabel: entity.normalizedLabel,
      confidence: entity.confidence,
      source: entity.source,
    }));
  }
}
