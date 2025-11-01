import { Inject, Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';
import { Identifier } from 'src/common/domain/types/identifier';

import {
  I_EMBEDDING_CLIENT_TOKEN,
  IEmbeddingClient,
} from 'src/modules/embedding/contracts/i-embedding-client.contract';

import { ICourseRepository } from '../contracts/i-course.repository';
import { CourseLearningOutcomeMatch } from '../types/course-learning-outcome.type';
import { CourseMatch } from '../types/course.type';

type FindCoursesBySkillsParams = {
  skills: string[];
  matchesPerSkill?: number;
  threshold?: number;
};

type CourseAggregation = {
  course: CourseMatch;
  cloMatches: Map<string, CourseLearningOutcomeMatch>;
  maxSimilarity: number;
};

type SkillAggregation = Map<string, CourseAggregation>;

@Injectable()
export class PrismaCourseRepository implements ICourseRepository {
  private static readonly DEFAULT_MATCHES_PER_SKILL = 20;
  private static readonly DEFAULT_THRESHOLD = 0.6;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(I_EMBEDDING_CLIENT_TOKEN)
    private readonly embeddingClient: IEmbeddingClient,
  ) {}

  async findCoursesBySkillsViaLO({
    skills,
    matchesPerSkill,
    threshold,
  }: FindCoursesBySkillsParams): Promise<Map<string, CourseMatch[]>> {
    const startTimeMs = Date.now();
    const normalizedSkills = Array.from(
      new Set(
        (skills ?? [])
          .map((skill) => skill.trim().toLowerCase())
          .filter((skill) => skill.length > 0),
      ),
    );

    if (!normalizedSkills.length) {
      const durationMs = Date.now() - startTimeMs;
      console.log(
        `[PrismaCourseRepository] findCoursesBySkillsViaLO completed in ${durationMs}ms (skills=0)`,
      );
      return new Map();
    }

    const matchesLimit = Math.max(
      matchesPerSkill ?? PrismaCourseRepository.DEFAULT_MATCHES_PER_SKILL,
      1,
    );
    const similarityThreshold =
      threshold ?? PrismaCourseRepository.DEFAULT_THRESHOLD;

    const skillEmbeddings = await this.embeddingClient.embedMany({
      texts: normalizedSkills,
      role: 'query',
    });

    const skillsWithEmbeddings = normalizedSkills
      .map((skill, index) => ({
        skill,
        vector: skillEmbeddings[index]?.vector ?? [],
      }))
      .filter(({ vector }) => vector.length > 0);

    const embeddingDimension = skillsWithEmbeddings[0]?.vector.length ?? 0;

    let rows: RawCourseQueryRow[] = [];

    if (skillsWithEmbeddings.length && embeddingDimension > 0) {
      const vectorType = Prisma.raw(`vector(${embeddingDimension})`);
      const skillEmbeddingValues = Prisma.join(
        skillsWithEmbeddings.map(({ skill, vector }) => {
          const vectorSql = Prisma.sql`ARRAY[${Prisma.join(
            vector.map((value) => Prisma.sql`${value}`),
          )}]::float4[]`;

          return Prisma.sql`(${skill}::text, (${vectorSql})::${vectorType})`;
        }),
      );

      rows = await this.prisma.$queryRaw<RawCourseQueryRow[]>`
        WITH input_skills AS (
          SELECT *
          FROM (VALUES ${skillEmbeddingValues}) AS v(skill, embedding)
        ),
        scored_clos AS (
          SELECT
            s.skill,
            c.id AS course_id,
            c.campus_id,
            c.faculty_id,
            c.academic_year,
            c.semester,
            c.subject_code,
            c.subject_name_th,
            c.subject_name_en,
            c.metadata AS course_metadata,
            c.created_at AS course_created_at,
            c.updated_at AS course_updated_at,
            cc.id AS course_clo_id,
            cc.clo_no,
            cc.created_at AS course_clo_created_at,
            cc.updated_at AS course_clo_updated_at,
            clo.id AS clo_id,
            clo.original_clo_name,
            clo.original_clo_name_en,
            clo.cleaned_clo_name_th,
            clo.cleaned_clo_name_en,
            clo.embedding::float4[] AS clo_embedding,
            clo.skip_embedding,
            clo.is_embedded,
            clo.metadata AS clo_metadata,
            clo.created_at AS clo_created_at,
            clo.updated_at AS clo_updated_at,
            1 - (clo.embedding <=> s.embedding) AS similarity,
            ROW_NUMBER() OVER (
              PARTITION BY s.skill, clo.id
              ORDER BY c.academic_year DESC, c.semester DESC, c.created_at DESC
            ) AS clo_course_rank
          FROM input_skills s
          JOIN course_learning_outcomes clo ON clo.is_embedded = TRUE
          JOIN course_clos cc ON cc.clo_id = clo.id
          JOIN courses c ON c.id = cc.course_id
        ),
        latest_clos AS (
          SELECT *
          FROM scored_clos
          WHERE clo_course_rank = 1
        ),
        ranked_clos AS (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY skill
              ORDER BY similarity DESC
            ) AS skill_rank
          FROM latest_clos
        )
        SELECT *
        FROM ranked_clos
        WHERE skill_rank <= ${matchesLimit}
          AND similarity >= ${similarityThreshold}
        ORDER BY skill, similarity DESC;
      `;
    }

    const skillAggregations = new Map<string, SkillAggregation>();

    for (const row of rows) {
      const skill = row.skill;
      if (!skillAggregations.has(skill)) {
        skillAggregations.set(skill, new Map());
      }

      const aggregation = skillAggregations.get(skill)!;

      let courseAggregation = aggregation.get(row.course_id);
      if (!courseAggregation) {
        courseAggregation = {
          course: {
            courseId: row.course_id as Identifier,
            campusId: row.campus_id as Identifier,
            facultyId: row.faculty_id as Identifier,
            academicYear: row.academic_year,
            semester: row.semester,
            subjectCode: row.subject_code,
            subjectNameTh: row.subject_name_th,
            subjectNameEn: row.subject_name_en,
            metadata: (row.course_metadata ?? null) as Record<
              string,
              any
            > | null,
            createdAt: row.course_created_at,
            updatedAt: row.course_updated_at,
            cloMatches: [],
          },
          cloMatches: new Map(),
          maxSimilarity: Number.NEGATIVE_INFINITY,
        };
        aggregation.set(row.course_id, courseAggregation);
      }

      if (!row.clo_id) {
        continue;
      }

      const similarity = Number(row.similarity ?? 0);
      const existingCLO = courseAggregation.cloMatches.get(row.clo_id);

      if (!existingCLO || similarity > existingCLO.similarityScore) {
        const cloMatch: CourseLearningOutcomeMatch = {
          cloId: row.clo_id as Identifier,
          courseId: row.course_id as Identifier,
          cloNo: row.clo_no,
          originalCLONameTh: row.original_clo_name,
          originalCLONameEn: row.original_clo_name_en,
          cleanedCLONameTh: row.cleaned_clo_name_th,
          cleanedCLONameEn: row.cleaned_clo_name_en,
          embedding: parseVector(row.clo_embedding),
          skipEmbedding: row.skip_embedding,
          isEmbedded: row.is_embedded,
          metadata: (row.clo_metadata ?? null) as Record<string, any> | null,
          createdAt: row.clo_created_at,
          updatedAt: row.clo_updated_at,
          similarityScore: similarity,
        };

        courseAggregation.cloMatches.set(row.clo_id, cloMatch);
      }

      courseAggregation.maxSimilarity = Math.max(
        courseAggregation.maxSimilarity,
        similarity,
      );
    }

    const result = new Map<string, CourseMatch[]>();

    for (const skill of normalizedSkills) {
      const aggregation = skillAggregations.get(skill);
      if (!aggregation) {
        result.set(skill, []);
        continue;
      }

      const courseMatches = Array.from(aggregation.values())
        .sort((a, b) => b.maxSimilarity - a.maxSimilarity)
        .slice(0, matchesLimit)
        .map(({ course, cloMatches }) => ({
          ...course,
          cloMatches: Array.from(cloMatches.values()).sort(
            (a, b) => b.similarityScore - a.similarityScore,
          ),
        }));

      result.set(skill, courseMatches);
    }

    const durationMs = Date.now() - startTimeMs;
    console.log(
      `[PrismaCourseRepository] findCoursesBySkillsViaLO completed in ${durationMs}ms (skills=${normalizedSkills.length})`,
    );

    return result;
  }
}

type RawCourseQueryRow = {
  skill: string;
  course_id: string;
  campus_id: string;
  faculty_id: string;
  academic_year: number;
  semester: number;
  subject_code: string;
  subject_name_th: string;
  subject_name_en: string | null;
  course_metadata: Prisma.JsonValue | null;
  course_created_at: Date;
  course_updated_at: Date;
  course_clo_id: string;
  clo_no: number;
  course_clo_created_at: Date;
  course_clo_updated_at: Date;
  clo_id: string;
  original_clo_name: string;
  original_clo_name_en: string | null;
  cleaned_clo_name_th: string;
  cleaned_clo_name_en: string | null;
  clo_embedding: unknown;
  skip_embedding: boolean;
  is_embedded: boolean;
  clo_metadata: Prisma.JsonValue | null;
  clo_created_at: Date;
  clo_updated_at: Date;
  similarity: number | Prisma.Decimal | string | null;
  skill_rank: number;
};

const VECTOR_PARSE_REGEX = /-?\d+\.?\d*/g;

function parseVector(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map(Number);
  }

  if (typeof raw === 'string') {
    const matches = raw.match(VECTOR_PARSE_REGEX);
    return matches ? matches.map(Number) : [];
  }

  return [];
}
