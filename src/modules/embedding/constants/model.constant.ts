export const VectorDimensions = {
  DIM_768: 768,
  DIM_1536: 1536,
} as const;

export type VectorDimension =
  (typeof VectorDimensions)[keyof typeof VectorDimensions];

export const EmbeddingModels = {
  E5_BASE: 'e5-base',
  OPENROUTER_OPENAI_3_SMALL: 'openai/text-embedding-3-small',
} as const;

export type EmbeddingModel =
  (typeof EmbeddingModels)[keyof typeof EmbeddingModels];

export const EmbeddingProviders = {
  E5: 'e5',
  OPENROUTER: 'openrouter',
} as const;

export type EmbeddingProvider =
  (typeof EmbeddingProviders)[keyof typeof EmbeddingProviders];

export type EmbeddingMetadata = {
  model: EmbeddingModel;
  provider: EmbeddingProvider;
  dimension: number;
};

export const EmbeddingRegistries: EmbeddingMetadata[] = [
  {
    model: EmbeddingModels.E5_BASE,
    provider: EmbeddingProviders.E5,
    dimension: 768,
  },
  {
    model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
    provider: EmbeddingProviders.OPENROUTER,
    dimension: 1536,
  },
];
