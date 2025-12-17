import { Identifier } from 'src/common/domain/types/identifier';

export type LearningOutcome = {
  loId: Identifier;
  originalNameTh: string;
  originalNameEn: string | null;
  cleanedNameTh: string;
  cleanedNameEn: string | null;
  skipEmbedding: boolean;
  hasEmbedding768: boolean;
  hasEmbedding1536: boolean;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MatchedLearningOutcome = LearningOutcome & {
  similarityScore: number;
};
