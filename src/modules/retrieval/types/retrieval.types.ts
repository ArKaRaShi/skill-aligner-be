export type VectorSearchParams = Readonly<{
  embedding: number[];
  perCourseMaxRank?: number;
  limit?: number;
}>;

export type VectorSearchResult = Readonly<{
  courseId: string;
  subjectCode: string;
  subjectNameTh: string;
  academicYear: number;
  semester: number;
  cloId: string;
  cloNameTh: string;
  cloMetadata: Record<string, unknown> | null;
  similarity: number;
}>;

export type RetrievalRequest = Readonly<{
  skillName: string;
  skillDescription: string;
  perCourseMaxRank?: number;
  limit?: number;
}>;

export type RetrievalMetadata = Readonly<{
  queryText: string;
  perCourseMaxRank: number;
  limit: number;
  embeddingModel: string;
  embeddingDimension: number;
  embeddedAt: string;
}>;

export type LabelerInput = Readonly<{
  queryText: string;
  skillName: string;
  skillDescription: string;
  clos: VectorSearchResult[];
}>;

export type LabelerOutput = Readonly<{
  rationale: string | null;
  labels: string[];
}>;

export type RetrievalResponse = Readonly<{
  metadata: RetrievalMetadata;
  clos: VectorSearchResult[];
  labelerOutput: LabelerOutput | null;
}>;
