import { Identifier } from 'src/shared/domain/value-objects/identifier';

export type LearningOutcome = {
  loId: Identifier;
  originalName: string;
  cleanedName: string;
  skipEmbedding: boolean;
  hasEmbedding768: boolean;
  hasEmbedding1536: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MatchedLearningOutcome = LearningOutcome & {
  similarityScore: number;
};
