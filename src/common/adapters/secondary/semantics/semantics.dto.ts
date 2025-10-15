export const SEMANTIC_EMBEDDING_MODEL = 'intfloat/e5-multilingual-large';
export const SEMANTIC_EMBEDDING_DIMENSION = 768;
export const SEMANTIC_EMBEDDED_AT = '2025-10-11T10:00:00Z';
export const SEMANTIC_ROLE_PATTERN = /^(query|passage)$/;

export type Role = 'query' | 'passage';

export type BaseResponse = {
  message: string;
};

export type SemanticResponse = BaseResponse & {
  model: string;
  dimension: number;
  embedded_at: string;
};

export type EmbedMetadataResponse = SemanticResponse & {
  original_text?: string;
  adjusted_text?: string;
};

export type SimilarityMetadataResponse = SemanticResponse & {
  original_text1?: string;
  adjusted_text1?: string;
  original_text2?: string;
  adjusted_text2?: string;
};

export type EmbedItemRequest = {
  text: string;
  role: Role;
};

export type EmbedItemResponse = EmbedMetadataResponse & {
  embedding: number[];
};

export type EmbedRequest = {
  text: string;
  role?: Role;
};

export type EmbedResponse = EmbedMetadataResponse & {
  embeddings: number[];
};

export type EmbedBatchRequest = {
  items: EmbedItemRequest[];
};

export type EmbedBatchResponse = SemanticResponse & {
  items: EmbedItemResponse[];
};

export type SimilarityRequest = {
  text1: string;
  text2: string;
};

export type SimilarityResponse = SimilarityMetadataResponse & {
  similarity: number;
};

export type SimilarityPairRequest = {
  text1: string;
  text2: string;
};

export type SimilarityBatchRequest = {
  pairs: SimilarityPairRequest[];
};

export type SimilarityPairResponse = SimilarityMetadataResponse & {
  similarity: number;
};

export type SimilarityBatchResponse = SemanticResponse & {
  items: SimilarityPairResponse[];
};
