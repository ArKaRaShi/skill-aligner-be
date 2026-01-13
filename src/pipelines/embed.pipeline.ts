import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import type { EmbedResult } from 'src/shared/adapters/embedding/providers/base-embedding-provider.abstract';
import { LocalEmbeddingProvider } from 'src/shared/adapters/embedding/providers/local-embedding.provider';
import { OpenRouterEmbeddingProvider } from 'src/shared/adapters/embedding/providers/openrouter-embedding.provider';
import { initSemanticsHttpClient } from 'src/shared/adapters/embedding/utils/semantics-http-client';
import { EmbeddingMetadataJson } from 'src/shared/contracts/types/stored-embedding-metadata.type';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { v4 as uuidv4 } from 'uuid';

// Define combined metadata structure that supports both embedding dimensions
type CombinedVectorMetadata = {
  vector_768?: EmbeddingMetadataJson;
  vector_1536?: EmbeddingMetadataJson;
};

type UpsertVectorRecordParams = {
  embeddedText: string;
  vectorColumn: 'embedding_768' | 'embedding_1536';
  vectorMetadata: EmbeddingMetadataJson;
  embedResult: EmbedResult;
  dimension: number;
  existingVectorId?: string | null;
};

type ExistingVectorRecord = {
  id: string;
  hasEmbedding768: boolean;
  hasEmbedding1536: boolean;
};

type CloVectorMapping = {
  cloId: string;
  vectorId: string;
  text: string;
};

@Injectable()
export class EmbedPipeline {
  private readonly logger = new Logger(EmbedPipeline.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async embedCourseLearningOutcomes(vectorDimension: number): Promise<void> {
    if (vectorDimension !== 768 && vectorDimension !== 1536) {
      throw new Error(
        `Unsupported vector dimension ${vectorDimension}. Only 768 or 1536 are supported.`,
      );
    }

    this.logger.log(`Embedding CLOs with ${vectorDimension} dimensions...`);

    // Step 1: Get all CLOs that need embedding for this dimension
    const clos = await this.prisma.courseLearningOutcome.findMany({
      where: {
        skipEmbedding: false,
        ...(vectorDimension === 768
          ? { hasEmbedding768: false }
          : { hasEmbedding1536: false }),
      },
    });
    this.logger.log(
      `Found ${clos.length} CLOs to embed (${vectorDimension} dimensions).`,
    );

    // Step 2: Prepare vector records for all CLOs
    const cloVectorMappings: CloVectorMapping[] = [];

    for (const clo of clos) {
      try {
        const existingVector = await this.findExistingVectorRecord(
          clo.cleanedCloName,
        );

        // Check if vector already has the required embedding
        const hasRequiredEmbedding =
          vectorDimension === 768
            ? existingVector?.hasEmbedding768
            : existingVector?.hasEmbedding1536;

        if (hasRequiredEmbedding) {
          // Link existing vector to CLO
          await this.prisma.$transaction(async (tx) => {
            await tx.courseLearningOutcome.update({
              where: { id: clo.id },
              data: {
                ...(vectorDimension === 768
                  ? { hasEmbedding768: true }
                  : { hasEmbedding1536: true }),
                vectorId: existingVector!.id,
              },
            });
          });
          continue;
        }

        // Prepare for embedding - create vector record if it doesn't exist
        const vectorId = existingVector?.id || uuidv4();

        if (!existingVector) {
          await this.prisma.$executeRaw`
            INSERT INTO course_learning_outcome_vectors (
              id,
              embedded_text,
              embedding_768,
              embedding_1536,
              metadata,
              created_at
            )
            VALUES (
              ${vectorId}::uuid,
              ${clo.cleanedCloName},
              NULL,
              NULL,
              NULL,
              NOW()
            )
            ON CONFLICT (embedded_text) DO NOTHING
          `;
        }

        cloVectorMappings.push({
          cloId: clo.id,
          vectorId,
          text: clo.cleanedCloName,
        });
      } catch (error) {
        this.logger.error(
          `Error preparing vector record for CLO ID ${clo.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Prepared ${cloVectorMappings.length} vector records for embedding.`,
    );

    // Step 3: Batch embed all texts in parallel
    const embeddingClient =
      vectorDimension === 768
        ? this.getE5EmbeddingClient()
        : this.getOpenRouterEmbeddingClient();

    const batchSize = 20;
    for (let i = 0; i < cloVectorMappings.length; i += batchSize) {
      const batch = cloVectorMappings.slice(i, i + batchSize);
      this.logger.log(
        `Processing embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cloVectorMappings.length / batchSize)} (${batch.length} items)`,
      );

      // Process embeddings in parallel
      const embeddingResults = await Promise.allSettled(
        batch.map(async ({ text, vectorId, cloId }) => {
          try {
            this.logger.log(`Embedding CLO ID ${cloId}...`);
            const embedResult = await embeddingClient.embedOne({
              text,
              role: 'passage',
            });

            // Validate embedding dimension
            if (embedResult.vector.length !== vectorDimension) {
              throw new Error(
                `Expected ${vectorDimension} dimensions for CLO ID ${cloId}, got ${embedResult.vector.length}`,
              );
            }

            return { vectorId, cloId, embedResult, text };
          } catch (error) {
            this.logger.error(`Error embedding CLO ID ${cloId}:`, error);
            throw error;
          }
        }),
      );

      // Step 4: Update vector records with embedding data in parallel
      await Promise.allSettled(
        embeddingResults.map(async (result, index) => {
          if (result.status === 'fulfilled') {
            const { vectorId, embedResult, text } = result.value;

            // Create metadata for this embedding dimension
            const vectorMetadata: EmbeddingMetadataJson = {
              model: embedResult.metadata.model,
              provider: embedResult.metadata.provider,
              dimension: embedResult.metadata.dimension,
              original_text: text,
              embed_text: embedResult.metadata.embeddedText,
              generated_at: embedResult.metadata.generatedAt,
            };

            try {
              await this.prisma.$transaction(async (tx) => {
                // Use existing upsertVectorRecord method for consistency
                const updatedVectorId = await this.upsertVectorRecord(
                  {
                    embeddedText: text,
                    vectorColumn:
                      vectorDimension === 768
                        ? 'embedding_768'
                        : 'embedding_1536',
                    vectorMetadata,
                    embedResult,
                    dimension: vectorDimension,
                    existingVectorId: vectorId,
                  },
                  tx,
                );

                // Update CLO to mark as embedded
                await tx.courseLearningOutcome.update({
                  where: { id: batch[index].cloId },
                  data: {
                    ...(vectorDimension === 768
                      ? { hasEmbedding768: true }
                      : { hasEmbedding1536: true }),
                    vectorId: updatedVectorId,
                  },
                });
              });
            } catch (error) {
              this.logger.error(
                `Error updating vector record for CLO ID ${batch[index].cloId}:`,
                error,
              );
            }
          } else {
            this.logger.error(
              `Failed to embed CLO ID ${batch[index].cloId}:`,
              result.reason,
            );
          }
        }),
      );
    }
  }

  private getE5EmbeddingClient(): LocalEmbeddingProvider {
    const semanticsClient = initSemanticsHttpClient({
      baseURL: this.appConfigService.semanticsApiBaseUrl,
    });
    return new LocalEmbeddingProvider({ client: semanticsClient });
  }

  private getOpenRouterEmbeddingClient(): OpenRouterEmbeddingProvider {
    return new OpenRouterEmbeddingProvider({
      apiKey: this.appConfigService.openRouterApiKey,
    });
  }

  private async findExistingVectorRecord(
    embeddedText: string,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<ExistingVectorRecord | null> {
    const rows = await tx.$queryRaw<ExistingVectorRecord[]>`
      SELECT
        id,
        (embedding_768 IS NOT NULL) AS "hasEmbedding768",
        (embedding_1536 IS NOT NULL) AS "hasEmbedding1536"
      FROM course_learning_outcome_vectors
      WHERE embedded_text = ${embeddedText}
      LIMIT 1
    `;

    return rows[0] ?? null;
  }

  private async upsertVectorRecord(
    {
      embeddedText,
      vectorColumn,
      vectorMetadata,
      embedResult,
      dimension,
      existingVectorId,
    }: UpsertVectorRecordParams,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    if (!embedResult || !vectorMetadata) {
      throw new Error('Embedding result is required to upsert vector.');
    }

    const vectorSql = this.buildVectorSql(embedResult.vector, dimension);
    const vectorId = existingVectorId ?? uuidv4();

    if (existingVectorId) {
      // Get existing metadata to merge with new metadata
      const existingVector = await tx.$queryRaw<
        { metadata: CombinedVectorMetadata | null }[]
      >`
        SELECT metadata
        FROM course_learning_outcome_vectors
        WHERE id = ${existingVectorId}::uuid
      `;

      const existingMetadata = existingVector[0]?.metadata || {};

      // Create proper nested metadata structure
      const metadataKey =
        vectorColumn === 'embedding_768' ? 'vector_768' : 'vector_1536';
      const mergedMetadata: CombinedVectorMetadata = {
        ...existingMetadata,
        [metadataKey]: vectorMetadata,
      };

      const metadataJson = JSON.stringify(mergedMetadata);

      await tx.$executeRaw`
        UPDATE course_learning_outcome_vectors
        SET ${Prisma.raw(vectorColumn)} = ${vectorSql},
            metadata = ${metadataJson}::jsonb
        WHERE id = ${existingVectorId}::uuid
      `;
      return existingVectorId;
    }

    // Create new vector record with proper nested metadata structure
    const metadataKey =
      vectorColumn === 'embedding_768' ? 'vector_768' : 'vector_1536';
    const newMetadata: CombinedVectorMetadata = {
      [metadataKey]: vectorMetadata,
    };
    const metadataJson = JSON.stringify(newMetadata);

    const embedding768Value =
      vectorColumn === 'embedding_768' ? vectorSql : Prisma.sql`NULL`;
    const embedding1536Value =
      vectorColumn === 'embedding_1536' ? vectorSql : Prisma.sql`NULL`;

    await tx.$executeRaw`
      INSERT INTO course_learning_outcome_vectors (
        id,
        embedded_text,
        embedding_768,
        embedding_1536,
        metadata,
        created_at
      )
      VALUES (
        ${vectorId}::uuid,
        ${embeddedText},
        ${embedding768Value},
        ${embedding1536Value},
        ${metadataJson}::jsonb,
        NOW()
      )
    `;

    return vectorId;
  }

  private buildVectorSql(vector: number[], dimension: number): Prisma.Sql {
    if (!vector?.length) {
      throw new Error('Embedding result returned an empty vector.');
    }

    const floatArray = Prisma.sql`ARRAY[${Prisma.join(
      vector.map((value) => Prisma.sql`${value}`),
    )}]::float4[]`;
    const vectorType = Prisma.raw(`vector(${dimension})`);
    return Prisma.sql`(${floatArray})::${vectorType}`;
  }
}
