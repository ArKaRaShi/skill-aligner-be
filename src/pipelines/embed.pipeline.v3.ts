import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import pLimit from 'p-limit';
import type { EmbedResult } from 'src/shared/adapters/embedding/providers/base-embedding-provider.abstract';
import { OpenRouterEmbeddingProvider } from 'src/shared/adapters/embedding/providers/openrouter-embedding.provider';
import { EmbeddingMetadataJson } from 'src/shared/contracts/types/stored-embedding-metadata.type';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { ArrayHelper } from 'src/shared/utils/array.helper';

// ============================================================================
// Configuration Constants (following coding standards - no magic numbers)
// ============================================================================

const EMBEDDING_CONFIG = {
  DIMENSION_1536: 1536,
  BATCH_SIZE: 50, // Texts per embedding batch
  CONCURRENT_BATCHES: 3, // Parallel batches (respect rate limits)
  CONCURRENT_UPDATES: 2, // Parallel DB updates (reduced to avoid connection pool exhaustion)
  TRANSACTION_MAX_WAIT_MS: 15_000, // Wait for a DB connection/transaction slot
  TRANSACTION_TIMEOUT_MS: 60_000, // Max time a transaction can run
  LOG_PREFIX_LENGTH: 50, // Characters to show in logs before truncating
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

type CloWithNeedsEmbedding = {
  id: string;
  cleanedCloName: string;
};

type TextToCloGroup = Map<string, string[]>; // cleanedCloName -> cloIds

type EmbeddingRequest = {
  text: string;
  cloIds: string[]; // All CLOs that have this text
};

type ExistingVectorLink = {
  text: string;
  cloIds: string[];
  vectorId: string;
};

type EmbeddingResult = {
  text: string;
  cloIds: string[];
  embedResult: EmbedResult;
  vectorMetadata: EmbeddingMetadataJson;
};

// ============================================================================
// Pipeline V3: Deduplicated, Batch Embedding for 1536 dimensions
// ============================================================================

@Injectable()
export class EmbedPipelineV3 {
  private readonly logger = new Logger(EmbedPipelineV3.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfigService: AppConfigService,
  ) {}

  /**
   * Main entry point: Embed all CLOs needing 1536-dimensional embeddings
   * with deduplication and batch processing.
   * @param options - Optional configuration for batch processing and delete/skip
   */
  async embedCourseLearningOutcomes(options?: {
    batchSize?: number;
    concurrentBatches?: number;
    deleteExisting?: boolean;
    embed?: boolean;
  }): Promise<void> {
    const {
      batchSize,
      concurrentBatches,
      deleteExisting = false,
      embed = true,
    } = options || {};

    this.logger.log(
      `Starting embedding pipeline v3 for ${EMBEDDING_CONFIG.DIMENSION_1536} dimensions...`,
    );

    // Phase 0: Delete existing embeddings if requested
    if (deleteExisting) {
      await this.deleteExisting1536Embeddings();
    }

    // Skip embedding if --no-embed flag is set
    if (!embed) {
      this.logger.log('Skipping embedding (--no-embed flag set).');
      return;
    }

    // Phase 1: Fetch CLOs needing embedding
    const clos = await this.fetchClosNeedingEmbedding();
    this.logger.log(`Found ${clos.length} CLOs needing embedding.`);

    if (clos.length === 0) {
      this.logger.log('No CLOs need embedding. Exiting.');
      return;
    }

    // Phase 2: Group by text (deduplication)
    const textToCloGroups = this.groupByText(clos);
    this.logger.log(
      `Grouped into ${textToCloGroups.size} unique texts (deduplication: ${clos.length} → ${textToCloGroups.size})`,
    );

    // Phase 3: Check existing vectors in ONE bulk query
    const { textsToEmbed, existingLinks } =
      await this.filterAlreadyEmbedded(textToCloGroups);
    this.logger.log(
      `After filtering existing vectors: ${textsToEmbed.length} texts need embedding, ${existingLinks.length} texts have existing embeddings.`,
    );

    // Phase 3.5: Link CLOs to existing vectors
    if (existingLinks.length > 0) {
      await this.linkCLOsToExistingVectors(existingLinks);
      this.logger.log(
        `Linked ${existingLinks.length} groups of CLOs to existing vectors.`,
      );
    }

    // Phase 4 & 5: Batch embed AND update (streaming: embed batch → update batch → next batch)
    if (textsToEmbed.length > 0) {
      await this.batchEmbedAndUpdate(textsToEmbed, {
        batchSize,
        concurrentBatches,
      });
    }

    this.logger.log('✅ Embedding pipeline v3 completed.');
  }

  // ==========================================================================
  // Phase 1: Fetch CLOs needing embedding
  // ==========================================================================

  /**
   * Fetch all CLOs that need 1536-dimensional embedding.
   * @pure false (DB query)
   * @testable Yes (can mock prisma.coursesLearningOutcome.findMany)
   */
  private async fetchClosNeedingEmbedding(): Promise<CloWithNeedsEmbedding[]> {
    return this.prisma.courseLearningOutcome.findMany({
      where: {
        skipEmbedding: false,
        hasEmbedding1536: false,
      },
      select: {
        id: true,
        cleanedCloName: true,
      },
    });
  }

  // ==========================================================================
  // Phase 2: Group by text (deduplication)
  // ==========================================================================

  /**
   * Group CLOs by their cleaned text for deduplication.
   * @pure Yes (no side effects)
   * @testable Yes (pure function, easy to test)
   */
  private groupByText(clos: CloWithNeedsEmbedding[]): TextToCloGroup {
    const groups = new Map<string, string[]>();

    for (const clo of clos) {
      const text = clo.cleanedCloName;
      if (!groups.has(text)) {
        groups.set(text, []);
      }
      groups.get(text)!.push(clo.id);
    }

    return groups;
  }

  // ==========================================================================
  // Phase 3: Filter already-embedded texts (BULK QUERY)
  // ==========================================================================

  /**
   * Filter out texts that already have embeddings using a SINGLE bulk query.
   * Returns texts that need embedding AND existing vector links.
   * @pure false (DB query)
   * @testable Yes (can mock prisma.$queryRaw)
   */
  private async filterAlreadyEmbedded(
    textToCloGroups: TextToCloGroup,
  ): Promise<{
    textsToEmbed: EmbeddingRequest[];
    existingLinks: ExistingVectorLink[];
  }> {
    const uniqueTexts = Array.from(textToCloGroups.keys());

    // SINGLE bulk query to check all texts at once and get their IDs
    const existingVectors = await this.prisma.$queryRaw<
      { embedded_text: string; id: string }[]
    >`
      SELECT embedded_text, id
      FROM course_learning_outcome_vectors
      WHERE embedded_text = ANY(${uniqueTexts}::text[])
        AND embedding_1536 IS NOT NULL
    `;

    this.logger.log(
      `Checked ${uniqueTexts.length} unique texts, found ${existingVectors.length} existing vectors with 1536 embeddings.`,
    );

    // Build Map of texts that already have 1536 embeddings
    const alreadyEmbedded = new Map<string, string>(
      existingVectors.map((v) => [v.embedded_text, v.id]),
    );

    this.logger.log(
      `${alreadyEmbedded.size} texts already have 1536 embeddings.`,
    );

    // Separate into texts to embed and existing links
    const textsToEmbed: EmbeddingRequest[] = [];
    const existingLinks: ExistingVectorLink[] = [];

    for (const [text, cloIds] of textToCloGroups.entries()) {
      const existingVectorId = alreadyEmbedded.get(text);
      if (existingVectorId) {
        existingLinks.push({ text, cloIds, vectorId: existingVectorId });
      } else {
        textsToEmbed.push({ text, cloIds });
      }
    }

    return { textsToEmbed, existingLinks };
  }

  // ==========================================================================
  // Phase 4 & 5: Batch embed AND update (streaming)
  // ==========================================================================

  /**
   * Embed texts in batches AND immediately update each batch (streaming).
   * This prevents overwhelming the database with thousands of concurrent updates.
   * @pure false (API calls + DB writes)
   * @testable Yes (can mock embedding client and prisma)
   */
  private async batchEmbedAndUpdate(
    requests: EmbeddingRequest[],
    options?: { batchSize?: number; concurrentBatches?: number },
  ): Promise<void> {
    const embeddingClient = this.getEmbeddingClient();

    // Use provided options or fall back to defaults
    const batchSize = options?.batchSize ?? EMBEDDING_CONFIG.BATCH_SIZE;
    const concurrentBatches =
      options?.concurrentBatches ?? EMBEDDING_CONFIG.CONCURRENT_BATCHES;

    // Chunk into batches
    const batches = ArrayHelper.chunk(requests, batchSize);
    this.logger.log(
      `Processing ${batches.length} batches (${concurrentBatches} concurrent, batch size: ${batchSize})...`,
    );

    // Process batches with concurrency limit (streaming: embed → update per batch)
    const limit = pLimit(concurrentBatches);
    const updateLimit = pLimit(EMBEDDING_CONFIG.CONCURRENT_UPDATES);

    const batchResults = await Promise.allSettled(
      batches.map(({ batchNumber, totalBatches, items: batch }) =>
        limit(async () =>
          this.embedBatchAndUpdate(
            batch,
            batchNumber,
            totalBatches,
            embeddingClient,
            updateLimit,
          ),
        ),
      ),
    );

    // Handle failures
    let successCount = 0;
    let failedCount = 0;

    for (const batchResult of batchResults) {
      if (batchResult.status === 'fulfilled') {
        successCount += batchResult.value;
      } else {
        failedCount++;
        this.logger.error(`Batch failed:`, batchResult.reason);
      }
    }

    this.logger.log(
      `✅ Batch processing complete: ${successCount} texts embedded and updated, ${failedCount} batches failed.`,
    );
  }

  /**
   * Embed a single batch AND immediately update all vectors in that batch.
   * Returns the number of texts successfully processed.
   */
  private async embedBatchAndUpdate(
    batch: EmbeddingRequest[],
    batchNumber: number,
    totalBatches: number,
    embeddingClient: OpenRouterEmbeddingProvider,
    updateLimit: ReturnType<typeof pLimit>,
  ): Promise<number> {
    this.logger.log(
      `Embedding batch ${batchNumber}/${totalBatches} (${batch.length} texts via embedMany)...`,
    );

    // Extract texts for embedMany
    const texts = batch.map((b) => b.text);

    // Single API call for all texts in batch
    const embedResults = await embeddingClient.embedMany({
      texts,
      role: 'passage',
    });

    // Match results back to their CLOs, validate, and build EmbeddingResult[]
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < embedResults.length; i++) {
      const embedResult = embedResults[i];
      const request = batch[i];

      // Validate dimension
      if (embedResult.vector.length !== EMBEDDING_CONFIG.DIMENSION_1536) {
        throw new Error(
          `Expected ${EMBEDDING_CONFIG.DIMENSION_1536} dimensions, got ${embedResult.vector.length}`,
        );
      }

      // Build metadata
      const vectorMetadata: EmbeddingMetadataJson = {
        model: embedResult.metadata.model,
        provider: embedResult.metadata.provider,
        dimension: embedResult.metadata.dimension,
        original_text: request.text,
        embed_text: embedResult.metadata.embeddedText,
        generated_at: embedResult.metadata.generatedAt,
      };

      results.push({
        text: request.text,
        cloIds: request.cloIds,
        embedResult,
        vectorMetadata,
      });
    }

    // IMMEDIATELY update this batch to database (streaming!)
    this.logger.log(
      `Updating batch ${batchNumber}/${totalBatches} (${results.length} vectors)...`,
    );

    const updateResults = await Promise.allSettled(
      results.map((result) =>
        updateLimit(() => this.updateVectorAndLinkCLOs(result)),
      ),
    );

    let successCount = 0;
    for (const updateResult of updateResults) {
      if (updateResult.status === 'fulfilled') {
        successCount += 1;
      }
    }

    return successCount;
  }

  // ==========================================================================
  // Phase 3.5: Link CLOs to existing vectors
  // ==========================================================================

  /**
   * Link CLOs to existing vectors (when vectors already have 1536 embeddings).
   */
  private async linkCLOsToExistingVectors(
    existingLinks: ExistingVectorLink[],
  ): Promise<void> {
    const limit = pLimit(EMBEDDING_CONFIG.CONCURRENT_UPDATES);

    await Promise.allSettled(
      existingLinks.map((link) =>
        limit(() => this.linkCLOsToExistingVector(link)),
      ),
    );
  }

  /**
   * Link a single group of CLOs to an existing vector.
   */
  private async linkCLOsToExistingVector(
    link: ExistingVectorLink,
  ): Promise<void> {
    const { text, cloIds, vectorId } = link;

    try {
      await this.prisma.courseLearningOutcome.updateMany({
        where: {
          id: { in: cloIds },
        },
        data: {
          hasEmbedding1536: true,
          vectorId,
        },
      });

      this.logger.log(
        `Linked ${cloIds.length} CLO(s) to existing vector for text: "${text.substring(0, EMBEDDING_CONFIG.LOG_PREFIX_LENGTH)}..."`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to link CLOs to existing vector for text "${text}":`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update a single vector record and link all associated CLOs.
   */
  private async updateVectorAndLinkCLOs(
    result: EmbeddingResult,
  ): Promise<void> {
    const { text, cloIds, embedResult, vectorMetadata } = result;

    try {
      await this.prisma.$transaction(
        async (tx) => {
          // Upsert vector record
          const vectorId = await this.upsertVectorRecord1536(
            {
              embeddedText: text,
              vectorMetadata,
              embedResult,
            },
            tx,
          );

          // Link ALL CLOs with this text to the vector
          const updateResult = await tx.courseLearningOutcome.updateMany({
            where: {
              id: { in: cloIds },
            },
            data: {
              hasEmbedding1536: true,
              vectorId,
            },
          });

          this.logger.log(
            `Linked ${updateResult.count} CLO(s) to vector for text: "${text.substring(0, EMBEDDING_CONFIG.LOG_PREFIX_LENGTH)}..."`,
          );
        },
        {
          maxWait: EMBEDDING_CONFIG.TRANSACTION_MAX_WAIT_MS,
          timeout: EMBEDDING_CONFIG.TRANSACTION_TIMEOUT_MS,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to update vector and link CLOs for text "${text}":`,
        error,
      );
      throw error;
    }
  }

  /**
   * Upsert a vector record with 1536-dimensional embedding.
   */
  private async upsertVectorRecord1536(
    {
      embeddedText,
      vectorMetadata,
      embedResult,
    }: {
      embeddedText: string;
      vectorMetadata: EmbeddingMetadataJson;
      embedResult: EmbedResult;
    },
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    // Check if vector exists
    const existing = await tx.courseLearningOutcomeVector.findUnique({
      where: { embeddedText },
      select: { id: true, metadata: true },
    });

    const vectorSql = this.buildVectorSql(
      embedResult.vector,
      EMBEDDING_CONFIG.DIMENSION_1536,
    );

    if (existing) {
      // Update existing vector - use raw SQL to avoid parameter binding issues
      const mergedMetadata = {
        ...((existing.metadata as object) || {}),
        vector_1536: vectorMetadata,
      };
      const metadataJson = JSON.stringify(mergedMetadata).replace(/'/g, "''");

      await tx.$executeRaw(
        Prisma.raw(`
          UPDATE course_learning_outcome_vectors
          SET embedding_1536 = ${vectorSql},
              metadata = '${metadataJson}'::jsonb
          WHERE id = '${existing.id}'::uuid
        `),
      );

      return existing.id;
    }

    // Create new vector - create record first without vector, then update with vector
    // This avoids parameter binding issues with vector columns
    const newVector = await tx.courseLearningOutcomeVector.create({
      data: {
        embeddedText,
        metadata: { vector_1536: vectorMetadata },
      },
      select: { id: true },
    });

    // Now update with the 1536 vector using raw SQL
    const metadataJson = JSON.stringify({
      vector_1536: vectorMetadata,
    }).replace(/'/g, "''");

    await tx.$executeRaw(
      Prisma.raw(`
        UPDATE course_learning_outcome_vectors
        SET embedding_1536 = ${vectorSql},
            metadata = '${metadataJson}'::jsonb
        WHERE id = '${newVector.id}'::uuid
      `),
    );

    return newVector.id;
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Delete all existing 1536-dimensional embeddings.
   * This resets hasEmbedding1536 to false and clears vectorId for all CLOs.
   */
  private async deleteExisting1536Embeddings(): Promise<void> {
    this.logger.log('Deleting existing 1536 embeddings...');

    // Reset all CLOs that have 1536 embeddings
    const result = await this.prisma.courseLearningOutcome.updateMany({
      where: {
        hasEmbedding1536: true,
      },
      data: {
        hasEmbedding1536: false,
        vectorId: null,
      },
    });

    this.logger.log(
      `✅ Reset ${result.count} CLOs (hasEmbedding1536: false, vectorId: null).`,
    );
  }

  private getEmbeddingClient(): OpenRouterEmbeddingProvider {
    return new OpenRouterEmbeddingProvider({
      apiKey: this.appConfigService.openRouterApiKey,
    });
  }

  private buildVectorSql(vector: number[], dimension: number): string {
    if (!vector?.length) {
      throw new Error('Embedding result returned an empty vector.');
    }

    // Build vector array SQL as a plain string
    const values = vector.map((v) => v.toString()).join(',');
    return `ARRAY[${values}]::float4[]::vector(${dimension})`;
  }
}
