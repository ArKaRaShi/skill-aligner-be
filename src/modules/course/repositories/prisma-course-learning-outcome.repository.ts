import { Inject, Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import {
  I_EMBEDDING_ROUTER_SERVICE_TOKEN,
  IEmbeddingRouterService,
} from 'src/shared/adapters/embedding/contracts/i-embedding-router-service.contract';
import { PrismaService } from 'src/shared/kernel/database/prisma.service';
import { estimateTokens } from 'src/shared/utils/token-estimation.util';

import {
  FindLosBySkillsOutput,
  FindLosBySkillsParams,
  ICourseLearningOutcomeRepository,
} from '../contracts/i-course-learning-outcome-repository.contract';
import { MatchedLearningOutcome } from '../types/course-learning-outcome-v2.type';
import { PrismaCourseLearningOutcomeV2Mapper } from './mappers/prisma-course-learning-outcome-v2.mapper';
import { RawCourseLearningOutcomeRow } from './types/raw-course-learning-outcome-row.type';

@Injectable()
export class PrismaCourseLearningOutcomeRepository
  implements ICourseLearningOutcomeRepository
{
  constructor(
    private readonly prisma: PrismaService,
    @Inject(I_EMBEDDING_ROUTER_SERVICE_TOKEN)
    private readonly embeddingRouterService: IEmbeddingRouterService,
  ) {}

  async findLosBySkills({
    skills,
    embeddingConfiguration,
    threshold = 0.6,
    topN = 10,
    campusId,
    facultyId,
    isGenEd,
    academicYearSemesters,
  }: FindLosBySkillsParams): Promise<FindLosBySkillsOutput> {
    if (!skills.length) {
      return {
        losBySkill: new Map<string, MatchedLearningOutcome[]>(),
        embeddingUsage: {
          bySkill: [],
          totalTokens: 0,
        },
      };
    }

    // Validate the embedding configuration has required fields
    if (!embeddingConfiguration.model || !embeddingConfiguration.provider) {
      throw new Error(
        `Invalid embedding configuration: model and provider are required`,
      );
    }

    // Generate embeddings for all skills using batch API (single API call)
    const embeddingResponses = await this.embeddingRouterService.embedMany({
      texts: skills,
      model: embeddingConfiguration.model,
      role: 'query', // for e5 model
    });

    // Map responses back to skills with their skill names
    const skillsWithEmbeddings = skills.map((skill, index) => ({
      skill,
      vector: embeddingResponses[index].vector,
      metadata: embeddingResponses[index].metadata,
    }));

    if (!skillsWithEmbeddings.length) {
      return {
        losBySkill: new Map<string, MatchedLearningOutcome[]>(),
        embeddingUsage: {
          bySkill: [],
          totalTokens: 0,
        },
      };
    }

    const embeddingDimension = skillsWithEmbeddings[0]?.vector.length ?? 0;
    const vectorType = Prisma.raw(`vector(${embeddingDimension})`);
    const embeddingColumnName =
      embeddingDimension === 768 ? 'embedding_768' : 'embedding_1536';
    const hasEmbeddingColumnName =
      embeddingDimension === 768 ? 'has_embedding_768' : 'has_embedding_1536';

    const academicYearSemesterClauses = (academicYearSemesters ?? []).map(
      ({ academicYear, semesters }) => {
        const normalizedSemesters = semesters ?? [];

        if (normalizedSemesters.length === 0) {
          return Prisma.sql`(co.academic_year = ${academicYear})`;
        }

        return Prisma.sql`(co.academic_year = ${academicYear} AND co.semester IN (${Prisma.join(
          normalizedSemesters,
        )}))`;
      },
    );

    const academicYearSemesterCondition =
      academicYearSemesterClauses.length > 0
        ? Prisma.sql`AND EXISTS (
            SELECT 1
            FROM course_offerings co
            WHERE co.course_id = c.id
              AND (${Prisma.join(academicYearSemesterClauses, ' OR ')})
          )`
        : Prisma.empty;

    const sharedFilterConditions = Prisma.sql`
      ${campusId ? Prisma.sql`AND c.campus_id = ${campusId}::uuid` : Prisma.empty}
      ${facultyId ? Prisma.sql`AND c.faculty_id = ${facultyId}::uuid` : Prisma.empty}
      ${isGenEd !== undefined ? Prisma.sql`AND c.is_gen_ed = ${isGenEd}` : Prisma.empty}
      ${academicYearSemesterCondition}
    `;

    const queryResults = await Promise.all(
      skillsWithEmbeddings.map(async ({ skill, vector, metadata }) => {
        const vectorArraySql = Prisma.sql`ARRAY[${Prisma.join(
          vector.map((value) => Prisma.sql`${value}`),
        )}]::float4[]`;
        const vectorSql = Prisma.sql`(${vectorArraySql})::${vectorType}`;

        const rows = await this.prisma.$queryRaw<RawCourseLearningOutcomeRow[]>`
        WITH filtered_clos AS (
          SELECT
            clo.id AS clo_id,
            clo.vector_id,
            clo.original_clo_name,
            clo.cleaned_clo_name_th,
            clo.skip_embedding,
            clo.has_embedding_768,
            clo.has_embedding_1536,
            clo.created_at,
            clo.updated_at,
            clov.${Prisma.raw(embeddingColumnName)} AS embedding
          FROM course_learning_outcomes clo
          JOIN course_learning_outcome_vectors clov ON clov.id = clo.vector_id
          JOIN courses c ON c.id = clo.course_id
          WHERE clo.${Prisma.raw(hasEmbeddingColumnName)} = TRUE
            AND clov.${Prisma.raw(embeddingColumnName)} IS NOT NULL
            ${sharedFilterConditions}
        ),
        distinct_vectors AS (
          SELECT DISTINCT ON (vector_id)
            vector_id,
            embedding
          FROM filtered_clos
        ),
        scored_vectors AS (
          SELECT
            vector_id,
            1 - (embedding <=> ${vectorSql}) AS similarity
          FROM distinct_vectors
        ),
        ranked_vectors AS (
          SELECT
            vector_id,
            similarity,
            ROW_NUMBER() OVER (
              ORDER BY similarity DESC
            ) AS vector_rank
          FROM scored_vectors
          WHERE similarity >= ${threshold}
        ),
        selected_vectors AS (
          SELECT
            vector_id,
            similarity
          FROM ranked_vectors
          WHERE vector_rank <= ${topN}
        )
        SELECT
          fc.clo_id,
          fc.original_clo_name,
          fc.cleaned_clo_name_th,
          fc.skip_embedding,
          fc.has_embedding_768,
          fc.has_embedding_1536,
          fc.created_at,
          fc.updated_at,
          sv.similarity
        FROM filtered_clos fc
        JOIN selected_vectors sv ON sv.vector_id = fc.vector_id
        ORDER BY sv.similarity DESC, fc.clo_id;
      `;

        const cloMatches: MatchedLearningOutcome[] = rows.map((row) => ({
          ...PrismaCourseLearningOutcomeV2Mapper.fromRawRowLoToDomainLo(row),
          similarityScore: Number(row.similarity),
        }));

        return { skill, cloMatches, metadata };
      }),
    );

    const losBySkill = new Map<string, MatchedLearningOutcome[]>();

    // Build bySkill array for EmbeddingUsage
    const bySkill: Array<{
      skill: string;
      model: string;
      provider: string;
      dimension: number;
      embeddedText: string;
      generatedAt: string;
      promptTokens: number;
      totalTokens: number;
    }> = [];

    for (const { skill, cloMatches, metadata } of queryResults) {
      losBySkill.set(skill, cloMatches);

      // Extract or estimate tokens
      const promptTokens =
        metadata.promptTokens ?? estimateTokens(metadata.embeddedText);
      const totalTokens = metadata.totalTokens ?? promptTokens;

      bySkill.push({
        skill,
        model: metadata.model,
        provider: metadata.provider,
        dimension: metadata.dimension,
        embeddedText: metadata.embeddedText,
        generatedAt: metadata.generatedAt,
        promptTokens,
        totalTokens,
      });
    }

    // Aggregate total tokens across all skills
    const totalTokens = bySkill.reduce(
      (sum, item) => sum + item.totalTokens,
      0,
    );

    const embeddingUsage = {
      bySkill,
      totalTokens,
    };

    return { losBySkill, embeddingUsage };
  }
}
