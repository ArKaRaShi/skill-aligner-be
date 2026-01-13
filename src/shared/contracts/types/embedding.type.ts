// Shared embedding types used across modules
// These types are domain-agnostic and can be imported by any module

export type EmbeddingMetadata = {
  model: string;
  provider: string;
  dimension: number;
};
