import { Identifier } from 'src/common/domain/types/identifier';

export type CourseLearningOutcome = {
  cloId: Identifier;
  courseId: Identifier;

  cloNo: number; // clo_no
  cloNameTh: string; // clo_name_th
  cloNameEn: string | null; // optional English name
  embedding: number[]; // vector embedding (768 dims)
  metadata: Record<string, any> | null; // optional JSON metadata

  createdAt: Date;
  updatedAt: Date;
};

export type CourseLearningOutcomeMatch = CourseLearningOutcome & {
  similarityScore: number;
};
