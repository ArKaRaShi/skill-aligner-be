export type RawCourseLearningOutcomeRow = {
  skill: string;
  clo_id: string;
  original_clo_name: string;
  cleaned_clo_name_th: string;
  skip_embedding: boolean;
  has_embedding_768: boolean;
  has_embedding_1536: boolean;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
  similarity: number;
};
