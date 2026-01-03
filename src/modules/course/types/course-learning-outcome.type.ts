import { Identifier } from 'src/shared/domain/value-objects/identifier';

export type CourseLearningOutcome = {
  cloId: Identifier;
  courseId: Identifier;
  cloNo: number;

  originalCLONameTh: string;
  originalCLONameEn: string | null;
  cleanedCloName: string;
  cleanedCLONameEn: string | null;
  embedding: number[];
  skipEmbedding: boolean;
  isEmbedded: boolean;
  metadata: Record<string, any> | null;

  createdAt: Date;
  updatedAt: Date;
};

export type CourseLearningOutcomeMatch = CourseLearningOutcome & {
  similarityScore: number;
};
