import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { v4 as uuidv4 } from 'uuid';

import { AppConfigService } from 'src/config/app-config.service';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';
import { initSemanticsHttpClient } from 'src/common/http/semantics-http-client';
import { EmbeddingMetadataJson } from 'src/common/types/stored-embedding-metadata.type';

import {
  E5EmbeddingClient,
  OpenRouterEmbeddingClient,
} from 'src/modules/embedding/clients';
import type { EmbedResult } from 'src/modules/embedding/clients/base-embedding.client';

type UpsertVectorRecordParams = {
  embeddedText: string;
  vectorColumn: 'embedding_768' | 'embedding_1536';
  vectorMetadata: Record<string, unknown>;
  embedResult: EmbedResult;
  dimension: number;
  existingVectorId?: string | null;
};

type ExistingVectorRecord = {
  id: string;
  hasEmbedding768: boolean;
  hasEmbedding1536: boolean;
};

@Injectable()
export class EmbedPipeline {
  private readonly logger = new Logger(EmbedPipeline.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async embedCourseLearningOutcomes(vectorDimension: number): Promise<void> {
    if (vectorDimension === 768) {
      console.log('Embedding CLOs with 768 dimensions...');
      await this.embedCloWithDimension768();
      return;
    }

    if (vectorDimension === 1536) {
      console.log('Embedding CLOs with 1536 dimensions...');
      await this.embedCloWithDimension1536();
      return;
    }

    throw new Error(
      `Unsupported vector dimension ${vectorDimension}. Only 768 or 1536 are supported.`,
    );
  }

  private async embedCloWithDimension768() {
    const embeddingClient = this.getE5EmbeddingClient();
    const clos = await this.prisma.courseLearningOutcome.findMany({
      where: {
        skipEmbedding: false,
        hasEmbedding768: false,
      },
    });
    console.log(`Found ${clos.length} CLOs to embed (768 dimensions).`);

    for (const clo of clos) {
      try {
        const existingVector = await this.findExistingVectorRecord(
          clo.cleanedCloName,
        );

        if (existingVector?.hasEmbedding768) {
          await this.prisma.$transaction(async (tx) => {
            await tx.courseLearningOutcome.update({
              where: { id: clo.id },
              data: {
                hasEmbedding768: true,
                vectorId: existingVector.id,
              },
            });
          });
          continue;
        }

        console.log(`Embedding CLO ID ${clo.id}...`);
        const embedResult = await embeddingClient.embedOne({
          text: clo.cleanedCloName,
          role: 'passage',
        });

        const vectorMetadata: { vector_768: EmbeddingMetadataJson } = {
          vector_768: {
            model: embedResult.metadata.model,
            provider: embedResult.metadata.provider,
            dimension: embedResult.metadata.dimension,
            original_text: clo.cleanedCloName,
            embed_text: embedResult.metadata.embeddedText,
            generated_at: embedResult.metadata.generatedAt,
          },
        };

        await this.prisma.$transaction(async (tx) => {
          const newVectorId = await this.upsertVectorRecord(
            {
              embeddedText: clo.cleanedCloName,
              vectorColumn: 'embedding_768',
              vectorMetadata,
              embedResult,
              dimension: 768,
              existingVectorId: existingVector?.id,
            },
            tx,
          );

          await tx.courseLearningOutcome.update({
            where: { id: clo.id },
            data: {
              hasEmbedding768: true,
              vectorId: newVectorId,
            },
          });
        });
      } catch (error) {
        console.error(`Error embedding CLO ID ${clo.id}:`, error);
      }
    }
  }

  private async embedCloWithDimension1536() {
    const embeddingClient = this.getOpenRouterEmbeddingClient();
    const clos = await this.prisma.courseLearningOutcome.findMany({
      where: {
        skipEmbedding: false,
        hasEmbedding1536: false,
      },
    });
    console.log(`Found ${clos.length} CLOs to embed (1536 dimensions).`);

    for (const clo of clos) {
      try {
        const existingVector = await this.findExistingVectorRecord(
          clo.cleanedCloName,
        );

        if (existingVector?.hasEmbedding1536) {
          await this.prisma.$transaction(async (tx) => {
            await tx.courseLearningOutcome.update({
              where: { id: clo.id },
              data: {
                hasEmbedding1536: true,
                vectorId: existingVector.id,
              },
            });
          });
          continue;
        }

        console.log(`Embedding CLO ID ${clo.id}...`);
        const embedResult = await embeddingClient.embedOne({
          text: clo.cleanedCloName,
          role: 'passage',
        });

        const vectorMetadata: { vector_1536: EmbeddingMetadataJson } = {
          vector_1536: {
            model: embedResult.metadata.model,
            provider: embedResult.metadata.provider,
            dimension: embedResult.metadata.dimension,
            original_text: clo.cleanedCloName,
            embed_text: embedResult.metadata.embeddedText,
            generated_at: embedResult.metadata.generatedAt,
          },
        };

        await this.prisma.$transaction(async (tx) => {
          const newVectorId = await this.upsertVectorRecord(
            {
              embeddedText: clo.cleanedCloName,
              vectorColumn: 'embedding_1536',
              vectorMetadata,
              embedResult,
              dimension: 1536,
              existingVectorId: existingVector?.id,
            },
            tx,
          );

          await tx.courseLearningOutcome.update({
            where: { id: clo.id },
            data: {
              hasEmbedding1536: true,
              vectorId: newVectorId,
            },
          });
        });
      } catch (error) {
        console.error(`Error embedding CLO ID ${clo.id}:`, error);
      }
    }
  }

  private getE5EmbeddingClient(): E5EmbeddingClient {
    const semanticsClient = initSemanticsHttpClient({
      baseURL: this.appConfigService.semanticsApiBaseUrl,
    });
    return new E5EmbeddingClient({ client: semanticsClient });
  }

  private getOpenRouterEmbeddingClient(): OpenRouterEmbeddingClient {
    return new OpenRouterEmbeddingClient({
      apiKey: this.appConfigService.openRouterApiKey,
    });
  }

  private async findExistingVectorRecord(
    embeddedText: string,
  ): Promise<ExistingVectorRecord | null> {
    const rows = await this.prisma.$queryRaw<ExistingVectorRecord[]>`
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
        { metadata: Record<string, unknown> | null }[]
      >`
        SELECT metadata
        FROM course_learning_outcome_vectors
        WHERE id = ${existingVectorId}::uuid
      `;

      const existingMetadata = existingVector[0]?.metadata || {};
      const mergedMetadata = { ...existingMetadata, ...vectorMetadata };
      const metadataJson = JSON.stringify(mergedMetadata);

      await tx.$executeRaw`
        UPDATE course_learning_outcome_vectors
        SET ${Prisma.raw(vectorColumn)} = ${vectorSql},
            metadata = ${metadataJson}::jsonb
        WHERE id = ${existingVectorId}::uuid
      `;
      return existingVectorId;
    }

    const metadataJson = JSON.stringify(vectorMetadata);

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
