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
  CONCURRENT_UPDATES: 10, // Parallel DB updates
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
   */
  async embedCourseLearningOutcomes(): Promise<void> {
    this.logger.log(
      `Starting embedding pipeline v3 for ${EMBEDDING_CONFIG.DIMENSION_1536} dimensions...`,
    );

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

    // Phase 4: Batch embed (only if there are texts to embed)
    let embeddingResults: EmbeddingResult[] = [];
    if (textsToEmbed.length > 0) {
      embeddingResults = await this.batchEmbedTexts(textsToEmbed);
      this.logger.log(
        `Successfully embedded ${embeddingResults.length} texts.`,
      );

      // Phase 5: Update vectors and link CLOs
      await this.updateVectorsAndLinkCLOs(embeddingResults);
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
  // Phase 4: Batch embed texts
  // ==========================================================================

  /**
   * Embed texts in batches with controlled concurrency.
   * @pure false (API calls)
   * @testable Yes (can mock embedding client)
   */
  private async batchEmbedTexts(
    requests: EmbeddingRequest[],
  ): Promise<EmbeddingResult[]> {
    const embeddingClient = this.getEmbeddingClient();

    // Chunk into batches
    const batches = ArrayHelper.chunk(requests, EMBEDDING_CONFIG.BATCH_SIZE);
    this.logger.log(
      `Processing ${batches.length} batches (${EMBEDDING_CONFIG.CONCURRENT_BATCHES} concurrent)...`,
    );

    // Process batches with concurrency limit
    const limit = pLimit(EMBEDDING_CONFIG.CONCURRENT_BATCHES);

    const batchResults = await Promise.allSettled(
      batches.map(({ batchNumber, totalBatches, items: batch }) =>
        limit(async () =>
          this.embedBatch(batch, batchNumber, totalBatches, embeddingClient),
        ),
      ),
    );

    // Flatten results and handle failures
    const results: EmbeddingResult[] = [];
    let failedCount = 0;

    for (const batchResult of batchResults) {
      if (batchResult.status === 'fulfilled') {
        results.push(...batchResult.value);
      } else {
        failedCount++;
        this.logger.error(`Batch failed:`, batchResult.reason);
      }
    }

    if (failedCount > 0) {
      this.logger.warn(
        `${failedCount} batches failed, ${results.length} texts embedded successfully.`,
      );
    }

    return results;
  }

  /**
   * Embed a single batch of texts in parallel.
   */
  private async embedBatch(
    batch: EmbeddingRequest[],
    batchNumber: number,
    totalBatches: number,
    embeddingClient: OpenRouterEmbeddingProvider,
  ): Promise<EmbeddingResult[]> {
    this.logger.log(
      `Embedding batch ${batchNumber}/${totalBatches} (${batch.length} texts)...`,
    );

    // Embed all texts in this batch in parallel
    const embedResults = await Promise.allSettled(
      batch.map(async ({ text }) => {
        const embedResult = await embeddingClient.embedOne({
          text,
          role: 'passage',
        });

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
          original_text: text,
          embed_text: embedResult.metadata.embeddedText,
          generated_at: embedResult.metadata.generatedAt,
        };

        return { text, embedResult, vectorMetadata };
      }),
    );

    // Match results back to their CLOs
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < embedResults.length; i++) {
      const result = embedResults[i];

      if (result.status === 'fulfilled') {
        results.push({
          ...result.value,
          cloIds: batch[i].cloIds,
        });
      } else {
        this.logger.error(
          `Failed to embed text "${batch[i].text}":`,
          result.reason,
        );
      }
    }

    return results;
  }

  // ==========================================================================
  // Phase 5: Update vectors and link CLOs
  // ==========================================================================

  /**
   * Update vector records with embeddings and link all CLOs.
   * @pure false (DB writes)
   * @testable Yes (can mock prisma)
   */
  private async updateVectorsAndLinkCLOs(
    results: EmbeddingResult[],
  ): Promise<void> {
    this.logger.log(
      `Updating ${results.length} vector records and linking CLOs...`,
    );

    const limit = pLimit(EMBEDDING_CONFIG.CONCURRENT_UPDATES);

    await Promise.allSettled(
      results.map((result) =>
        limit(() => this.updateVectorAndLinkCLOs(result)),
      ),
    );
  }

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
      await this.prisma.$transaction(async (tx) => {
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
      });
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
