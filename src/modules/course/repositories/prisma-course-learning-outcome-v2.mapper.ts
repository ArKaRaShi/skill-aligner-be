import { Prisma } from '@prisma/client';

import { Identifier } from 'src/common/domain/types/identifier';

import { LearningOutcome } from '../types/course-learning-outcome-v2.type';
import { RawCourseLearningOutcomeRow } from './types/raw-course-learning-outcome-row.type';

type PrismaCourseCloWithLearningOutcome = Prisma.CourseCLOGetPayload<{
  include: { learningOutcome: true };
}>;

export class PrismaCourseLearningOutcomeV2Mapper {
  private static normalizeMetadata(
    metadata: Prisma.JsonValue | null,
  ): Record<string, any> | null {
    if (metadata === null) {
      return null;
    }

    return metadata as Record<string, any>;
  }

  static fromCourseCloToLearningOutcome(
    courseClo: PrismaCourseCloWithLearningOutcome,
  ): LearningOutcome | null {
    const learningOutcome = courseClo.learningOutcome;
    if (!learningOutcome) {
      return null;
    }

    return {
      loId: courseClo.cloId as Identifier,
      originalNameTh: learningOutcome.originalCLONameTh,
      originalNameEn: learningOutcome.originalCLONameEn,
      cleanedNameTh: learningOutcome.cleanedCLONameTh,
      cleanedNameEn: learningOutcome.cleanedCLONameEn,
      skipEmbedding: learningOutcome.skipEmbedding,
      hasEmbedding768: learningOutcome.hasEmbedding768,
      hasEmbedding1536: learningOutcome.hasEmbedding1536,
      metadata: this.normalizeMetadata(learningOutcome.metadata),
      createdAt: learningOutcome.createdAt,
      updatedAt: learningOutcome.updatedAt,
    };
  }

  static fromRawLearningOutcomeRowToLearningOutcome(
    row: RawCourseLearningOutcomeRow,
  ): LearningOutcome {
    return {
      loId: row.clo_id as Identifier,
      originalNameTh: row.original_clo_name,
      originalNameEn: row.original_clo_name_en,
      cleanedNameTh: row.cleaned_clo_name_th,
      cleanedNameEn: row.cleaned_clo_name_en,
      skipEmbedding: row.skip_embedding,
      hasEmbedding768: row.has_embedding_768,
      hasEmbedding1536: row.has_embedding_1536,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
