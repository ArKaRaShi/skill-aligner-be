export type RawCloVectorRow = {
  id: string;
  cleaned_clo_name: string;
  embedding_768: number[] | null;
  embedding_1536: number[] | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type RawCloVectorRowWithFlags = RawCloVectorRow & {
  hasEmbedding768: boolean;
  hasEmbedding1536: boolean;
};
