import { Inject, Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/common/adapters/secondary/prisma/prisma.service';
import { Identifier } from 'src/common/domain/types/identifier';

import {
  I_EMBEDDING_CLIENT_TOKEN,
  IEmbeddingClient,
} from 'src/modules/embedding/contracts/i-embedding-client.contract';

import {
  FindCoursesByLearningOutcomeIdsParams,
  ICourseRepository,
} from '../contracts/i-course-repository.contract';
import { LearningOutcome } from '../types/course-learning-outcome-v2.type';
import {
  CourseLearningOutcome,
  CourseLearningOutcomeMatch,
} from '../types/course-learning-outcome.type';
import {
  Course,
  CourseMatch,
  CourseWithLearningOutcomeV2Match,
} from '../types/course.type';
import { parseVector } from './helpers/vector.helper';
import { PrismaCourseLearningOutcomeV2Mapper } from './prisma-course-learning-outcome-v2.mapper';
import { FindCourseByIdRawRow } from './types/find-course-by-id-raw.type';
import { RawCourseQueryRow } from './types/raw-course-query-row.type';

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
  private readonly DEFAULT_MATCHES_PER_SKILL = 20;
  private readonly DEFAULT_THRESHOLD = 0.6;

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
    if (!skills.length) {
      return new Map<string, CourseMatch[]>();
    }

    const matchesLimit = matchesPerSkill ?? this.DEFAULT_MATCHES_PER_SKILL;
    const similarityThreshold = threshold ?? this.DEFAULT_THRESHOLD;
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
      return new Map<string, CourseMatch[]>();
    }

    const embeddingDimension = 768;
    const embeddingColumnName = 'embedding_768';
    const hasEmbeddingColumnName = 'has_embedding_768';
    if (
      skillsWithEmbeddings[0]?.vector.length &&
      skillsWithEmbeddings[0]?.vector.length !== embeddingDimension
    ) {
      throw new Error(
        `Expected embedding dimension ${embeddingDimension} but received ${skillsWithEmbeddings[0]?.vector.length}`,
      );
    }

    const vectorType = Prisma.raw(`vector(${embeddingDimension})`);
    const skillEmbeddingValues = Prisma.join(
      skillsWithEmbeddings.map(({ skill, vector }) => {
        const vectorSql = Prisma.sql`ARRAY[${Prisma.join(
          vector.map((value) => Prisma.sql`${value}`),
        )}]::float4[]`;

        return Prisma.sql`(${skill}::text, (${vectorSql})::${vectorType})`;
      }),
    );

    const rows = await this.prisma.$queryRaw<RawCourseQueryRow[]>`
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
            clov.${Prisma.raw(embeddingColumnName)}::float4[] AS clo_embedding,
            clo.skip_embedding,
            clo.${Prisma.raw(hasEmbeddingColumnName)} AS is_embedded,
            clo.metadata AS clo_metadata,
            clo.created_at AS clo_created_at,
            clo.updated_at AS clo_updated_at,
            1 - (clov.${Prisma.raw(embeddingColumnName)} <=> s.embedding) AS similarity,
            ROW_NUMBER() OVER (
              PARTITION BY s.skill, clo.id
              ORDER BY c.academic_year DESC, c.semester DESC, c.created_at DESC
            ) AS clo_course_rank
          FROM input_skills s
          JOIN course_learning_outcomes clo ON clo.${Prisma.raw(
            hasEmbeddingColumnName,
          )} = TRUE
          JOIN course_learning_outcome_vectors clov
            ON clov.clo_id = clo.id
           AND clov.${Prisma.raw(embeddingColumnName)} IS NOT NULL
          JOIN course_clos cc ON cc.clo_id = clo.id
          JOIN courses c ON c.id = cc.course_id
        ),
        latest_clos AS (
          SELECT *
          FROM scored_clos
          WHERE clo_course_rank = 1
        ),
        course_ranked_clos AS (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY skill, course_id
              ORDER BY similarity DESC
            ) AS course_clo_rank
          FROM latest_clos
        ),
        best_clo_per_course AS (
          SELECT *
          FROM course_ranked_clos
          WHERE course_clo_rank = 1
        ),
        ranked_courses AS (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY skill
              ORDER BY similarity DESC
            ) AS skill_rank
          FROM best_clo_per_course
        )
        SELECT *
        FROM ranked_courses
        WHERE skill_rank <= ${matchesLimit}
          AND similarity >= ${similarityThreshold}
        ORDER BY skill, similarity DESC;
      `;

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

    for (const skill of skills) {
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

    return result;
  }

  async findCourseByLearningOutcomeIds({
    learningOutcomeIds,
    campusId,
    facultyId,
    isGenEd,
    academicYearSemesters,
  }: FindCoursesByLearningOutcomeIdsParams): Promise<
    Map<Identifier, CourseWithLearningOutcomeV2Match[]>
  > {
    if (!learningOutcomeIds.length) {
      return new Map<Identifier, CourseWithLearningOutcomeV2Match[]>();
    }

    // TODO: Future chunking
    const courseWhere: Prisma.CourseWhereInput = {
      courseLearningOutcomes: {
        some: {
          cloId: {
            in: learningOutcomeIds,
          },
        },
      },
    };

    if (campusId) {
      courseWhere.campusId = campusId;
    }

    if (facultyId) {
      courseWhere.facultyId = facultyId;
    }

    if (isGenEd !== undefined) {
      courseWhere.isGenEd = isGenEd;
    }

    if (academicYearSemesters && academicYearSemesters.length > 0) {
      const yearSemesterConditions = academicYearSemesters.map(
        ({ academicYear, semesters }) =>
          semesters && semesters.length > 0
            ? {
                academicYear,
                semester: {
                  in: semesters,
                },
              }
            : { academicYear },
      );

      const existingAnd = courseWhere.AND
        ? Array.isArray(courseWhere.AND)
          ? courseWhere.AND
          : [courseWhere.AND]
        : [];

      courseWhere.AND = [
        ...existingAnd,
        {
          OR: yearSemesterConditions,
        },
      ];
    }

    const courses = await this.prisma.course.findMany({
      where: courseWhere,
      include: {
        courseLearningOutcomes: {
          include: {
            learningOutcome: true,
          },
          orderBy: {
            cloNo: 'asc',
          },
        },
      },
      orderBy: [
        { academicYear: 'desc' },
        { semester: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const learningOutcomeIdSet = new Set<Identifier>(learningOutcomeIds);
    const result = new Map<Identifier, CourseWithLearningOutcomeV2Match[]>();

    for (const course of courses) {
      const allLearningOutcomes: LearningOutcome[] = [];

      for (const courseClo of course.courseLearningOutcomes) {
        const learningOutcome =
          PrismaCourseLearningOutcomeV2Mapper.fromCourseCloToLearningOutcome(
            courseClo,
          );
        if (!learningOutcome) {
          continue;
        }

        allLearningOutcomes.push(learningOutcome);
      }

      if (!allLearningOutcomes.length) {
        continue;
      }

      const matchingLearningOutcomes = allLearningOutcomes.filter((lo) =>
        learningOutcomeIdSet.has(lo.loId),
      );

      if (!matchingLearningOutcomes.length) {
        continue;
      }

      const baseCourseInfo = {
        courseId: course.id as Identifier,
        campusId: course.campusId as Identifier,
        facultyId: course.facultyId as Identifier,
        academicYear: course.academicYear,
        semester: course.semester,
        subjectCode: course.subjectCode,
        subjectNameTh: course.subjectNameTh,
        subjectNameEn: course.subjectNameEn,
        metadata: (course.metadata as Record<string, any>) ?? null,
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      };

      for (const learningOutcome of matchingLearningOutcomes) {
        const courseResult: CourseWithLearningOutcomeV2Match = {
          ...baseCourseInfo,
          learningOutcomeMatch: learningOutcome,
          learningOutcomes: allLearningOutcomes,
        };

        if (!result.has(learningOutcome.loId)) {
          result.set(learningOutcome.loId, []);
        }

        result.get(learningOutcome.loId)!.push(courseResult);
      }
    }

    return result;
  }

  async findByIdOrThrow(courseId: Identifier): Promise<Course> {
    const rows = await this.prisma.$queryRaw<FindCourseByIdRawRow[]>`
      SELECT
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
        clov.embedding_768::float4[] AS embedding_768,
        clo.skip_embedding,
        clo.has_embedding_768 AS is_embedded,
        clo.metadata AS clo_metadata,
        clo.created_at AS clo_created_at,
        clo.updated_at AS clo_updated_at
      FROM courses c
      LEFT JOIN course_clos cc ON c.id = cc.course_id
      LEFT JOIN course_learning_outcomes clo ON cc.clo_id = clo.id
      LEFT JOIN course_learning_outcome_vectors clov ON clo.id = clov.clo_id
      WHERE c.id = ${courseId}::uuid
      ORDER BY cc.clo_no;
    `;

    if (!rows.length) {
      throw new Error(`Course with id ${courseId} not found`);
    }

    const firstRow = rows[0];
    const courseLearningOutcomes: CourseLearningOutcome[] = rows
      .filter((row) => row.clo_id)
      .map((row) => {
        const embedding = parseVector(row.embedding_768);

        return {
          cloId: row.clo_id as Identifier,
          courseId: row.course_id as Identifier,
          cloNo: row.clo_no,
          originalCLONameTh: row.original_clo_name,
          originalCLONameEn: row.original_clo_name_en,
          cleanedCLONameTh: row.cleaned_clo_name_th,
          cleanedCLONameEn: row.cleaned_clo_name_en,
          embedding,
          skipEmbedding: row.skip_embedding,
          isEmbedded: row.is_embedded,
          metadata: row.clo_metadata,
          createdAt: row.clo_created_at,
          updatedAt: row.clo_updated_at,
        };
      });

    return {
      courseId: firstRow.course_id as Identifier,
      campusId: firstRow.campus_id as Identifier,
      facultyId: firstRow.faculty_id as Identifier,
      academicYear: firstRow.academic_year,
      semester: firstRow.semester,
      subjectCode: firstRow.subject_code,
      subjectNameTh: firstRow.subject_name_th,
      subjectNameEn: firstRow.subject_name_en,
      courseLearningOutcomes,
      metadata: firstRow.course_metadata,
      createdAt: firstRow.course_created_at,
      updatedAt: firstRow.course_updated_at,
    };
  }
}
