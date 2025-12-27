/**
 * Cost rate for a specific model ID on a provider.
 */
export interface LLMModelCostRate {
  inputCostPerMillionTokens: number; // cost per million input tokens
  outputCostPerMillionTokens: number; // cost per million output tokens
}

/**
 * Complete registration data for an LLM model.
 * Combines model identification, provider information, and cost data.
 */
export interface LLMModelRegistration {
  // Base model name (e.g., 'gpt-4o-mini')
  // This is the canonical name used throughout the application
  baseModel: string;
  // Provider-specific model ID (e.g., 'openai/gpt-4o-mini')
  // This is the actual identifier used when calling the provider's API
  modelId: string;
  // Provider name (e.g., 'openrouter', 'openai')
  provider: string;
  // Cost rates for this specific model ID
  cost: LLMModelCostRate;
}

/**
 * Model provider mapping with model identifier.
 * Used by ModelRegistryService for registration.
 */
export interface ModelProviderMapping {
  modelId: string;
  provider: string;
}
