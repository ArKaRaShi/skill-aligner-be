import { Prisma } from '@prisma/client';

import { Identifier } from 'src/shared/contracts/types/identifier';

import { LearningOutcome } from '../../types/course-learning-outcome-v2.type';
import { RawCourseLearningOutcomeRow } from '../types/raw-course-learning-outcome-row.type';

type PrismaCourseLearningOutcomeWithVector =
  Prisma.CourseLearningOutcomeGetPayload<{
    include: { vector: true };
  }>;

export class PrismaCourseLearningOutcomeV2Mapper {
  static fromPrismaLoToDomainLo(
    courseLearningOutcome: PrismaCourseLearningOutcomeWithVector,
  ): LearningOutcome {
    return {
      loId: courseLearningOutcome.id as Identifier,
      originalName: courseLearningOutcome.originalCloName,
      cleanedName: courseLearningOutcome.cleanedCloName,
      skipEmbedding: courseLearningOutcome.skipEmbedding,
      hasEmbedding768: courseLearningOutcome.hasEmbedding768,
      hasEmbedding1536: courseLearningOutcome.hasEmbedding1536,
      createdAt: courseLearningOutcome.createdAt,
      updatedAt: courseLearningOutcome.updatedAt,
    };
  }

  static fromRawRowLoToDomainLo(
    row: RawCourseLearningOutcomeRow,
  ): LearningOutcome {
    return {
      loId: row.clo_id as Identifier,
      originalName: row.original_clo_name,
      cleanedName: row.cleaned_clo_name_th,
      skipEmbedding: row.skip_embedding,
      hasEmbedding768: row.has_embedding_768,
      hasEmbedding1536: row.has_embedding_1536,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
