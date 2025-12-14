import { Inject, Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';

import { EMBEDDING_MODELS } from 'src/modules/embedding/constants/model.constant';
import {
  I_EMBEDDING_CLIENT_TOKEN,
  IEmbeddingClient,
} from 'src/modules/embedding/contracts/i-embedding-client.contract';

import {
  FindLosBySkillsParams,
  ICourseLearningOutcomeRepository,
} from '../contracts/i-course-learning-outcome.repository';
import { LearningOutcomeMatch } from '../types/course-learning-outcome-v2.type';
import { PrismaCourseLearningOutcomeV2Mapper } from './prisma-course-learning-outcome-v2.mapper';
import { RawCourseLearningOutcomeRow } from './types/raw-course-learning-outcome-row.type';

@Injectable()
export class PrismaCourseLearningOutcomeRepository
  implements ICourseLearningOutcomeRepository
{
  constructor(
    private readonly prisma: PrismaService,
    @Inject(I_EMBEDDING_CLIENT_TOKEN)
    private readonly embeddingClient: IEmbeddingClient,
  ) {}

  async findLosBySkills({
    skills,
    threshold = 0.75,
    topN = 10,
    vectorDimension = 768,
    campusId,
    facultyId,
    isGenEd = false,
    academicYearSemesters,
  }: FindLosBySkillsParams): Promise<Map<string, LearningOutcomeMatch[]>> {
    if (!skills.length) {
      return new Map<string, LearningOutcomeMatch[]>();
    }

    // Get the appropriate embedding model based on vector dimension
    const embeddingModel = Object.values(EMBEDDING_MODELS).find(
      (model) => model.dimension === vectorDimension,
    );

    if (!embeddingModel) {
      throw new Error(
        `No embedding model found for vector dimension: ${vectorDimension}`,
      );
    }

    // Generate embeddings for all skills
    const skillsWithEmbeddings = await Promise.all(
      skills.map(async (skill) => {
        const embeddingResponse = await this.embeddingClient.embedOne({
          text: skill,
          role: 'query',
        });

        return {
          skill,
          vector: embeddingResponse.vector,
        };
      }),
    );

    if (!skillsWithEmbeddings.length) {
      return new Map<string, LearningOutcomeMatch[]>();
    }

    const embeddingDimension = skillsWithEmbeddings[0]?.vector.length ?? 0;
    const vectorType = Prisma.raw(`vector(${embeddingDimension})`);
    const embeddingColumnName =
      vectorDimension === 768 ? 'embedding_768' : 'embedding_1536';
    const hasEmbeddingColumnName =
      vectorDimension === 768 ? 'has_embedding_768' : 'has_embedding_1536';

    const skillEmbeddingValues = Prisma.join(
      skillsWithEmbeddings.map(({ skill, vector }) => {
        const vectorSql = Prisma.sql`ARRAY[${Prisma.join(
          vector.map((value) => Prisma.sql`${value}`),
        )}]::float4[]`;

        return Prisma.sql`(${skill}::text, (${vectorSql})::${vectorType})`;
      }),
    );

    const academicYearSemesterClauses = (academicYearSemesters ?? []).map(
      ({ academicYear, semesters }) => {
        const normalizedSemesters = semesters ?? [];

        if (normalizedSemesters.length === 0) {
          return Prisma.sql`(c.academic_year = ${academicYear})`;
        }

        return Prisma.sql`(c.academic_year = ${academicYear} AND c.semester IN (${Prisma.join(
          normalizedSemesters,
        )}))`;
      },
    );

    const academicYearSemesterCondition =
      academicYearSemesterClauses.length > 0
        ? Prisma.sql`AND (${Prisma.join(academicYearSemesterClauses, ' OR ')})`
        : Prisma.empty;

    const rows = await this.prisma.$queryRaw<RawCourseLearningOutcomeRow[]>`
      WITH input_skills AS (
        SELECT *
        FROM (VALUES ${skillEmbeddingValues}) AS v(skill, embedding)
      ),
      scored_clos AS (
        SELECT
          s.skill,
          clo.id AS clo_id,
          clo.original_clo_name,
          clo.original_clo_name_en,
          clo.cleaned_clo_name_th,
          clo.cleaned_clo_name_en,
          clo.skip_embedding,
          clo.has_embedding_768,
          clo.has_embedding_1536,
          clo.metadata,
          clo.created_at,
          clo.updated_at,
          1 - (clov.${Prisma.raw(embeddingColumnName)} <=> s.embedding) AS similarity
        FROM input_skills s
        JOIN course_learning_outcome_vectors clov ON clov.${Prisma.raw(embeddingColumnName)} IS NOT NULL
        JOIN course_learning_outcomes clo ON clo.id = clov.clo_id
        JOIN course_clos cc ON cc.clo_id = clo.id
        JOIN courses c ON c.id = cc.course_id
        WHERE clo.${Prisma.raw(hasEmbeddingColumnName)} = TRUE
          ${campusId ? Prisma.sql`AND c.campus_id = ${campusId}::uuid` : Prisma.empty}
          ${facultyId ? Prisma.sql`AND c.faculty_id = ${facultyId}::uuid` : Prisma.empty}
          ${isGenEd !== undefined ? Prisma.sql`AND c.is_gen_ed = ${isGenEd}` : Prisma.empty}
          ${academicYearSemesterCondition}
      ),
      deduped_clos AS (
        SELECT
          skill,
          clo_id,
          original_clo_name,
          original_clo_name_en,
          cleaned_clo_name_th,
          cleaned_clo_name_en,
          skip_embedding,
          has_embedding_768,
          has_embedding_1536,
          metadata,
          created_at,
          updated_at,
          similarity
        FROM (
          SELECT
            sc.*,
            ROW_NUMBER() OVER (
              PARTITION BY sc.skill, sc.clo_id
              ORDER BY sc.similarity DESC
            ) AS clo_rank
          FROM scored_clos sc
        ) ranked_sc
        WHERE clo_rank = 1
      ),
      ranked_clos AS (
        SELECT
          *,
          ROW_NUMBER() OVER (
            PARTITION BY skill
            ORDER BY similarity DESC
          ) AS skill_rank
        FROM deduped_clos
      )
      SELECT *
      FROM ranked_clos
      WHERE skill_rank <= ${topN}
        AND similarity >= ${threshold}
      ORDER BY skill, similarity DESC;
    `;

    const result = new Map<string, LearningOutcomeMatch[]>();

    for (const skill of skills) {
      const matchingRows = rows.filter((row) => row.skill === skill);

      const cloMatches: LearningOutcomeMatch[] = matchingRows.map((row) => ({
        ...PrismaCourseLearningOutcomeV2Mapper.fromRawLearningOutcomeRowToLearningOutcome(
          row,
        ),
        similarityScore: Number(row.similarity),
      }));

      result.set(skill, cloMatches);
    }

    return result;
  }
}
