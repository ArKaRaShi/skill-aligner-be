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
        isEmbedded: false,
      },
    });
    console.log(`Found ${clos.length} CLOs to embed.`);

    for (const clo of clos) {
      try {
        const embedResult = await embeddingClient.embedOne({
          text: clo.cleanedCLONameTh,
          role: 'passage',
        });
        await prismaClient.$executeRaw`
            UPDATE course_learning_outcomes
            SET embedding = ${embedResult.vector}::vector,
                is_embedded = true,
                metadata = ${JSON.stringify(embedResult.metadata)}::jsonb
            WHERE id = ${clo.id}::uuid
        `;
      } catch (error) {
        console.error(`Error embedding CLO ID ${clo.id}:`, error);
      }
    }

    const previewCLOs = await prismaClient.$queryRaw<
      {
        id: string;
        cleanedCLONameTh: string;
        embedding: number[];
        isEmbedded: boolean;
        metadata: Record<string, unknown>;
      }[]
    >`
    SELECT
        id,
        cleaned_clo_name_th AS "cleanedCLONameTh",
        embedding::float4[] AS embedding,
        is_embedded AS "isEmbedded",
        metadata
    FROM course_learning_outcomes
    WHERE is_embedded = true
    LIMIT 3
    `;

    for (const clo of previewCLOs) {
      console.log('Preview embedded CLO:', {
        id: clo.id,
        cleanedCLONameTh: clo.cleanedCLONameTh,
        previewEmbedding: clo.embedding.slice(0, 5),
        isEmbedded: clo.isEmbedded,
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
