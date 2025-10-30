export type ProviderModelMetadata = {
  modelId: string;
  provider: 'e5' | 'openai';
  dimension: number;
};

export const EMBEDDING_MODELS: Record<string, ProviderModelMetadata> = {
  'e5-base': {
    modelId: 'e5-base',
    provider: 'e5',
    dimension: 768,
  },
  'text-embedding-3-small': {
    modelId: 'text-embedding-3-small',
    provider: 'openai',
    dimension: 1536,
  },
};
