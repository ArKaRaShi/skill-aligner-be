/**
 * Interface for model registry service.
 * Manages mappings between models and their available providers.
 */
export interface IModelRegistry {
  /**
   * Registers a model with its available providers.
   * @param model - The model identifier (e.g., "openai/gpt-4.1")
   * @param providers - Array of provider names that support this model
   */
  registerModel(model: string, providers: string[]): void;

  /**
   * Gets all providers that support a given model.
   * @param model - The model identifier
   * @returns Array of provider names, or empty array if model not found
   */
  getProvidersForModel(model: string): string[];

  /**
   * Checks if a model is available on a specific provider.
   * @param model - The model identifier
   * @param provider - The provider name (optional, checks any provider if not specified)
   * @returns true if model is available on the provider
   */
  isModelAvailable(model: string, provider?: string): boolean;

  /**
   * Gets all registered models.
   * @returns Array of model identifiers
   */
  getAllModels(): string[];

  /**
   * Checks if a model is registered.
   * @param model - The model identifier
   * @returns true if model is registered
   */
  isModelRegistered(model: string): boolean;
}

export const I_MODEL_REGISTRY_TOKEN = Symbol('IModelRegistry');
