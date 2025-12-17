import { PrismaClient } from '@prisma/client';

import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

import { initSemanticsHttpClient } from 'src/common/http/semantics-http-client';

import {
  E5EmbeddingClient,
  OpenAIEmbeddingClient,
} from 'src/modules/embedding/clients';

dotenv.config();

const prismaClient = new PrismaClient();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SEMANTICS_API_BASE_URL =
  process.env.SEMANTICS_API_BASE_URL ||
  'http://localhost:8000/api/v1/semantics';

export class EmbedCLOPipeline {
  static async embed768() {
    console.log('Embedding CLOs with 768 dimensions...');
    const embeddingClient = this.getEmbeddingClient('e5');

    const clos = await prismaClient.courseLearningOutcome.findMany({
      where: {
        skipEmbedding: false,
        hasEmbedding768: false,
      },
    });
    console.log(`Found ${clos.length} CLOs to embed.`);

    for (const clo of clos) {
      try {
        console.log(`Embedding CLO ID ${clo.id}...`);
        const embedResult = await embeddingClient.embedOne({
          text: clo.cleanedCLONameTh,
          role: 'passage',
        });

        // Create or update embedding vector record
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
                ${uuidv4()}::uuid,
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

  static async embed1536() {
    console.log('Embedding CLOs with 1536 dimensions...');
    const embeddingClient = this.getEmbeddingClient('openrouter');

    const clos = await prismaClient.courseLearningOutcome.findMany({
      where: {
        skipEmbedding: false,
        hasEmbedding1536: false,
      },
    });
    console.log(`Found ${clos.length} CLOs to embed.`);

    for (const clo of clos) {
      try {
        const embedResult = await embeddingClient.embedOne({
          text: clo.cleanedCLONameTh,
          role: 'passage',
        });

        // Create or update embedding vector record
        const existingVector =
          await prismaClient.courseLearningOutcomeVector.findUnique({
            where: { cloId: clo.id },
          });

        const vectorMetadata = {
          vector_1536: {
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
              SET embedding_1536 = ${embedResult.vector}::vector(1536),
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
                ${uuidv4()}::uuid,
                ${clo.id}::uuid,
                NULL,
                ${embedResult.vector}::vector(1536),
                ${JSON.stringify(vectorMetadata)}::jsonb,
                NOW()
              )
          `;
        }

        // Update the CLO to mark as embedded
        await prismaClient.courseLearningOutcome.update({
          where: { id: clo.id },
          data: { hasEmbedding1536: true },
        });
      } catch (error) {
        console.error(`Error embedding CLO ID ${clo.id}:`, error);
      }
    }

    const previewCLOs = await prismaClient.$queryRaw<
      {
        id: string;
        cleanedCLONameTh: string;
        embedding1536: number[];
        hasEmbedding1536: boolean;
        metadata: Record<string, unknown>;
      }[]
    >`
    SELECT
        clo.id,
        clo.cleaned_clo_name_th AS "cleanedCLONameTh",
        clov.embedding_1536::float4[] AS "embedding1536",
        clo.has_embedding_1536 AS "hasEmbedding1536",
        clo.metadata
    FROM course_learning_outcomes clo
    LEFT JOIN course_learning_outcome_vectors clov ON clo.id = clov.clo_id
    WHERE clo.has_embedding_1536 = true
    LIMIT 3
    `;

    for (const clo of previewCLOs) {
      console.log('Preview embedded CLO:', {
        id: clo.id,
        cleanedCLONameTh: clo.cleanedCLONameTh,
        previewEmbedding: clo.embedding1536
          ? clo.embedding1536.slice(0, 5)
          : null,
        hasEmbedding1536: clo.hasEmbedding1536,
        metadata: clo.metadata,
      });
    }
  }

  private static getEmbeddingClient(
    provider: 'e5' | 'openrouter' | 'openai' = 'e5',
  ) {
    if (provider === 'e5') {
      const semanticsClient = initSemanticsHttpClient({
        baseURL: SEMANTICS_API_BASE_URL,
      });
      const e5Client = new E5EmbeddingClient({ client: semanticsClient });
      return e5Client;
    }
    if (provider === 'openrouter') {
      return new OpenAIEmbeddingClient({
        apiKey: process.env.OPENROUTER_API_KEY || '',
      });
    }
    return new OpenAIEmbeddingClient({ apiKey: OPENAI_API_KEY });
  }
}

async function runPipeline768() {
  await EmbedCLOPipeline.embed768();
  console.log('CLO 768-dimension embedding completed successfully.');
}

async function runPipeline1536() {
  await EmbedCLOPipeline.embed1536();
  console.log('CLO 1536-dimension embedding completed successfully.');
}

// Get the command line argument to determine which pipeline to run
const pipelineType = process.argv[2];

if (pipelineType === '768') {
  runPipeline768()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(
        'Error during CLO 768-dimension embedding pipeline:',
        error,
      );
      process.exit(1);
    });
} else if (pipelineType === '1536') {
  runPipeline1536()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(
        'Error during CLO 1536-dimension embedding pipeline:',
        error,
      );
      process.exit(1);
    });
} else {
  console.log(
    'Usage: bunx ts-node --require tsconfig-paths/register src/modules/course/pipelines/embed-clo.pipeline.ts [768|1536]',
  );
  process.exit(1);
}

// bunx ts-node --require tsconfig-paths/register src/modules/course/pipelines/embed-clo.pipeline.ts 768
// bunx ts-node --require tsconfig-paths/register src/modules/course/pipelines/embed-clo.pipeline.ts 1536
