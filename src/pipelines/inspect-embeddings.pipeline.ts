import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { OpenRouterEmbeddingProvider } from 'src/shared/adapters/embedding/providers/openrouter-embedding.provider';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';

type TopResult = {
  cloId: string;
  courseId: string;
  subjectCode: string;
  subjectName: string;
  cloNo: number;
  originalCloName: string;
  cleanedCloName: string;
  similarity: number;
};

@Injectable()
export class InspectEmbeddingsPipeline {
  private readonly logger = new Logger(InspectEmbeddingsPipeline.name);
  private readonly EMBEDDING_DIMENSION = 1536;

  constructor(
    private readonly prisma: PrismaService,
    private readonly appConfigService: AppConfigService,
  ) {}

  async queryAndLogTop5(queryText: string): Promise<void> {
    this.logger.log(`Querying 1536-dimensional embeddings for: "${queryText}"`);

    const embeddingClient = this.getEmbeddingClient();
    const { vector: queryVector } = await embeddingClient.embedOne({
      text: queryText,
      role: 'query',
    });

    if (queryVector.length !== this.EMBEDDING_DIMENSION) {
      throw new Error(
        `Expected ${this.EMBEDDING_DIMENSION} dimensions, got ${queryVector.length}`,
      );
    }

    const vectorSql = this.buildVectorSql(queryVector);
    const results = await this.prisma.$queryRaw<TopResult[]>`
      WITH query_embedding AS (
        SELECT ${vectorSql} AS vector
      )
      SELECT
        clo.id AS "cloId",
        c.id AS "courseId",
        c.subject_code AS "subjectCode",
        c.subject_name AS "subjectName",
        clo.clo_no AS "cloNo",
        clo.original_clo_name AS "originalCloName",
        clo.cleaned_clo_name_th AS "cleanedCloName",
        1 - (clov.embedding_1536 <=> qe.vector) AS similarity
      FROM query_embedding qe
      JOIN course_learning_outcome_vectors clov ON clov.embedding_1536 IS NOT NULL
      JOIN course_learning_outcomes clo ON clo.vector_id = clov.id
      JOIN courses c ON c.id = clo.course_id
      WHERE clo.has_embedding_1536 = TRUE
        AND clov.embedding_1536 IS NOT NULL
      ORDER BY similarity DESC
      LIMIT 5
    `;

    this.logger.log(`Top 5 results for query: "${queryText}"`);

    if (results.length === 0) {
      this.logger.log('No results found');
      return;
    }

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      this.logger.log(
        `${i + 1}. [${result.similarity.toFixed(4)}] ${result.subjectCode} - CLO#${result.cloNo}: "${result.cleanedCloName}"`,
      );
    }
  }

  private getEmbeddingClient(): OpenRouterEmbeddingProvider {
    return new OpenRouterEmbeddingProvider({
      apiKey: this.appConfigService.openRouterApiKey,
    });
  }

  private buildVectorSql(vector: number[]): Prisma.Sql {
    if (!vector?.length) {
      throw new Error('Vector is required to build SQL');
    }

    const floatArray = Prisma.sql`ARRAY[${Prisma.join(
      vector.map((value) => Prisma.sql`${value}`),
    )}]::float4[]`;
    const vectorType = Prisma.raw(`vector(${this.EMBEDDING_DIMENSION})`);
    return Prisma.sql`(${floatArray})::${vectorType}`;
  }
}

async function runInspectEmbeddingsPipeline() {
  const mockConfig: AppConfigService = {
    nodeEnv: process.env.NODE_ENV || 'development',
    openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  } as AppConfigService;
  const prisma = new PrismaService(mockConfig);
  const pipeline = new InspectEmbeddingsPipeline(prisma, mockConfig);

  await pipeline.queryAndLogTop5('data analysis and visualization');
}

if (require.main === module) {
  runInspectEmbeddingsPipeline()
    .then(() => {
      console.log('Pipeline execution completed.');
    })
    .catch((error) => {
      console.error('Error during pipeline execution:', error);
    });
}

// bunx ts-node --require tsconfig-paths/register src/pipelines/inspect-embeddings.pipeline.ts
