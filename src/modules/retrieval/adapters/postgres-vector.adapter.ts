import { Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';

import { VectorAdapterContract } from '../contracts/vector.contract';
import {
  VectorSearchParams,
  VectorSearchResult,
} from '../types/retrieval.types';

type VectorSearchRow = {
  course_id: string;
  subject_code: string;
  subject_name_th: string;
  academic_year: number;
  semester: number;
  clo_id: string;
  clo_name_th: string;
  clo_metadata: Record<string, unknown> | null;
  similarity: number;
};

@Injectable()
export class PostgresVectorAdapter implements VectorAdapterContract {
  constructor(private readonly prisma: PrismaService) {}

  async findSimilarClos(
    params: VectorSearchParams,
  ): Promise<VectorSearchResult[]> {
    const perCourseMaxRank = params.perCourseMaxRank ?? 3;
    const limit = params.limit ?? 50;
    if (!params.embedding.length) {
      throw new Error('Embedding vector must contain at least one dimension.');
    }
    const embeddingVectorLiteral = Prisma.raw(
      `[${params.embedding.join(',')}]::vector`,
    );

    const rows = await this.prisma.$queryRaw<VectorSearchRow[]>`
      WITH ranked_clos AS (
        SELECT
          c.id AS course_id,
          c.subject_code,
          c.subject_name_th,
          c.academic_year,
          c.semester,
          clo.id AS clo_id,
          clo.clo_name_th,
          clo.metadata AS clo_metadata,
          1 - (clo.embedding <=> ${embeddingVectorLiteral}) AS raw_similarity,
          ROW_NUMBER() OVER (
            PARTITION BY c.id
            ORDER BY (clo.embedding <=> ${embeddingVectorLiteral}) ASC
          ) AS rn
        FROM course_learning_outcomes AS clo
        JOIN courses AS c ON c.id = clo.course_id
      ),
      filtered_clos AS (
        SELECT *
        FROM ranked_clos
        WHERE rn <= ${perCourseMaxRank}
      ),
      deduped AS (
        SELECT
          filtered_clos.*,
          ROW_NUMBER() OVER (
            PARTITION BY clo_name_th
            ORDER BY raw_similarity DESC
          ) AS name_rank
        FROM filtered_clos
      )
      SELECT
        course_id,
        subject_code,
        subject_name_th,
        academic_year,
        semester,
        clo_id,
        clo_name_th,
        clo_metadata,
        ROUND(raw_similarity::numeric, 4) AS similarity
      FROM deduped
      WHERE name_rank = 1
      ORDER BY similarity DESC
      LIMIT ${limit};
    `;

    return rows.map<VectorSearchResult>((row) => ({
      courseId: row.course_id,
      subjectCode: row.subject_code,
      subjectNameTh: row.subject_name_th,
      academicYear: row.academic_year,
      semester: row.semester,
      cloId: row.clo_id,
      cloNameTh: row.clo_name_th,
      cloMetadata: row.clo_metadata,
      similarity: Number(row.similarity),
    }));
  }
}
