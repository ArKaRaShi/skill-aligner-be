// Centralized types for embedding adapter (matches LLM pattern)

export interface EmbeddingModelCost {
  inputCostPerMillionTokens: number;
  outputCostPerMillionTokens: number;
}

export interface EmbeddingModelRegistration {
  baseModel: string; // User-facing model name (e.g., 'e5-base')
  modelId: string; // Provider-specific model ID (e.g., 'openai/text-embedding-3-small')
  provider: string; // Provider name (e.g., 'local', 'openrouter')
  dimension: number; // Vector dimension
  cost: EmbeddingModelCost; // Cost information
}
