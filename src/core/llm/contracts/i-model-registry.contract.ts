/**
 * Interface for model registry service.
 * Manages mappings between models and their provider-specific model identifiers.
 * Registrations are fixed at application startup and cannot be modified at runtime.
 */
export interface IModelRegistry {
  /**
   * Gets all providers that support a given model.
   * @param model - The model name
   * @returns Array of provider names, or empty array if model not found
   */
  getProvidersForModel(model: string): string[];

  /**
   * Checks if a model is available on a specific provider.
   * @param model - The model name
   * @param provider - The provider name (optional, checks any provider if not specified)
   * @returns true if model is available on the provider
   */
  isModelAvailable(model: string, provider?: string): boolean;

  /**
   * Gets all registered models.
   * @returns Array of model names
   */
  getAllModels(): string[];

  /**
   * Checks if a model is registered.
   * @param model - The model name
   * @returns true if model is registered
   */
  isModelRegistered(model: string): boolean;

  /**
   * Gets the total number of registered models.
   * @returns Number of registered models
   */
  getModelCount(): number;

  /**
   * Gets all models available on a specific provider.
   * @param provider - The provider name
   * @returns Array of model names available on the provider
   */
  getModelsForProvider(provider: string): string[];

  /**
   * Gets the provider for a specific model identifier.
   * @param modelId - The provider-specific model identifier
   * @returns Provider name, or undefined if not found
   */
  getProviderForModelId(modelId: string): string | undefined;

  /**
   * Gets all model identifiers for a model.
   * @param model - The model name
   * @returns Array of model identifiers for the model
   */
  getModelIdsForModel(model: string): string[];

  /**
   * Gets the provider-specific model identifier for a given model and provider.
   * @param model - The base model name
   * @param provider - The provider name
   * @returns The provider-specific model ID, or undefined if not found
   */
  getModelIdForProvider(model: string, provider: string): string | undefined;

  /**
   * Resolves a model identifier (base model or provider-specific model ID) to a provider-specific model ID.
   * Accepts both base model names (e.g., 'gpt-4.1-mini') and provider-specific model IDs (e.g., 'openai/gpt-4.1-mini').
   * Always returns the provider-specific model ID.
   *
   * @param model - The model identifier (base model name or provider-specific model ID)
   * @param provider - Optional provider name. If not specified and model is a provider-specific model ID, uses the model ID's provider.
   * @returns The provider-specific model ID, or undefined if not found
   * @throws Error if model is a provider-specific model ID but provider is specified and doesn't match
   */
  resolveModelId(model: string, provider?: string): string | undefined;
}

export const I_MODEL_REGISTRY_TOKEN = Symbol('IModelRegistry');
