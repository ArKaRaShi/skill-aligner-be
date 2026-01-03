// Embedding model registry (matches LLM pattern)
import { EmbeddingModelRegistration } from '../types/embedding.type';

export const EmbeddingModels = {
  E5_BASE: 'e5-base',
  OPENROUTER_OPENAI_3_SMALL: 'openai/text-embedding-3-small',
} as const;

export type EmbeddingModel =
  (typeof EmbeddingModels)[keyof typeof EmbeddingModels];

export const EmbeddingProviders = {
  LOCAL: 'local',
  OPENROUTER: 'openrouter',
} as const;

export type EmbeddingProvider =
  (typeof EmbeddingProviders)[keyof typeof EmbeddingProviders];

/**
 * Unified embedding model registry constant.
 * Single source of truth for all model registrations.
 * When adding a new model, add an entry here with all required data.
 */
export const EMBEDDING_MODEL_REGISTRATIONS: EmbeddingModelRegistration[] = [
  // Local E5 model (your Semantics API)
  {
    baseModel: 'e5-base',
    modelId: 'e5-base',
    provider: 'local',
    dimension: 768,
    cost: {
      inputCostPerMillionTokens: 0, // Free (your own service)
      outputCostPerMillionTokens: 0, // Vectors are free
    },
  },
  // OpenRouter models
  {
    baseModel: 'text-embedding-3-small',
    modelId: 'openai/text-embedding-3-small',
    provider: 'openrouter',
    dimension: 1536,
    cost: {
      inputCostPerMillionTokens: 0.02, // $0.02 per 1M input tokens
      outputCostPerMillionTokens: 0, // Vectors are free
    },
  },
];
