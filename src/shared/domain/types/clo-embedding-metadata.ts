export type CloEmbeddingMetadata = Readonly<{
  model: string;
  dimension: number;
  embeddedAt: string;
  by: string;
  note?: string;
  originalText?: string;
  adjustedText?: string;
}>;
