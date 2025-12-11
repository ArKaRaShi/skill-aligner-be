import { PrismaClient } from '@prisma/client';

import dotenv from 'dotenv';

import { initSemanticsHttpClient } from 'src/common/http/semantics-http-client';

import {
  E5EmbeddingClient,
  OpenAIEmbeddingClient,
} from 'src/modules/embedding/clients';

dotenv.config();

const prismaClient = new PrismaClient();

const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'e5';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SEMANTICS_API_BASE_URL =
  process.env.SEMANTICS_API_BASE_URL ||
  'http://localhost:8000/api/v1/semantics';

export class EmbedCLOPipeline {
  static async execute() {
    console.log('Embedding CLOs...');
    const embeddingClient = this.getEmbeddingClient();

    const clos = await prismaClient.courseLearningOutcome.findMany({
      where: {
        skipEmbedding: false,
        hasEmbedding768: false,
      },
    });
    console.log(`Found ${clos.length} CLOs to embed.`);

    for (const clo of clos) {
      try {
        const embedResult = await embeddingClient.embedOne({
          text: clo.cleanedCLONameTh,
          role: 'passage',
        });

        // Create or update the embedding vector record
        const existingVector =
          await prismaClient.courseLearningOutcomeVector.findUnique({
            where: { cloId: clo.id },
          });

        const vectorMetadata = {
          vector_768: {
            model_id: embedResult.metadata.modelId,
            provider: embedResult.metadata.provider,
            dimension: embedResult.metadata.dimension,
            original_text: clo.cleanedCLONameTh,
            embed_text: embedResult.metadata.embeddedText,
            generated_at: embedResult.metadata.generatedAt,
          },
        };

        if (existingVector) {
          await prismaClient.$executeRaw`
              UPDATE course_learning_outcome_vectors
              SET embedding_768 = ${embedResult.vector}::vector(768),
                  metadata = ${JSON.stringify(vectorMetadata)}::jsonb
              WHERE clo_id = ${clo.id}::uuid
          `;
        } else {
          await prismaClient.$executeRaw`
              INSERT INTO course_learning_outcome_vectors (
                id,
                clo_id,
                embedding_768,
                embedding_1536,
                metadata,
                created_at
              )
              VALUES (
                ${crypto.randomUUID()}::uuid,
                ${clo.id}::uuid,
                ${embedResult.vector}::vector(768),
                NULL,
                ${JSON.stringify(vectorMetadata)}::jsonb,
                NOW()
              )
          `;
        }

        // Update the CLO to mark as embedded
        await prismaClient.courseLearningOutcome.update({
          where: { id: clo.id },
          data: { hasEmbedding768: true },
        });
      } catch (error) {
        console.error(`Error embedding CLO ID ${clo.id}:`, error);
      }
    }

    const previewCLOs = await prismaClient.$queryRaw<
      {
        id: string;
        cleanedCLONameTh: string;
        embedding768: number[];
        hasEmbedding768: boolean;
        metadata: Record<string, unknown>;
      }[]
    >`
    SELECT
        clo.id,
        clo.cleaned_clo_name_th AS "cleanedCLONameTh",
        clov.embedding_768::float4[] AS "embedding768",
        clo.has_embedding_768 AS "hasEmbedding768",
        clo.metadata
    FROM course_learning_outcomes clo
    LEFT JOIN course_learning_outcome_vectors clov ON clo.id = clov.clo_id
    WHERE clo.has_embedding_768 = true
    LIMIT 3
    `;

    for (const clo of previewCLOs) {
      console.log('Preview embedded CLO:', {
        id: clo.id,
        cleanedCLONameTh: clo.cleanedCLONameTh,
        previewEmbedding: clo.embedding768
          ? clo.embedding768.slice(0, 5)
          : null,
        hasEmbedding768: clo.hasEmbedding768,
        metadata: clo.metadata,
      });
    }
  }

  private static getEmbeddingClient() {
    if (EMBEDDING_PROVIDER === 'e5') {
      const semanticsClient = initSemanticsHttpClient({
        baseURL: SEMANTICS_API_BASE_URL,
      });
      const e5Client = new E5EmbeddingClient({ client: semanticsClient });
      return e5Client;
    }
    return new OpenAIEmbeddingClient({ apiKey: OPENAI_API_KEY });
  }
}

async function runPipeline() {
  await EmbedCLOPipeline.execute();
  console.log('CLO embedding completed successfully.');
}

runPipeline()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error during CLO embedding pipeline:', error);
    process.exit(1);
  });

// bunx ts-node --require tsconfig-paths/register src/modules/course/pipelines/embed-clo.pipeline.ts
