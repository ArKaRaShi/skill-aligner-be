import { ModelProviderMapping } from '../models';

/**
 * Interface for model registry service.
 * Manages mappings between models and their provider-specific model identifiers.
 */
export interface IModelRegistry {
  /**
   * Registers a model with its provider-specific model identifiers.
   * @param model - The model name (e.g., "gpt-4o-mini")
   * @param providerMappings - Array of model identifiers and their providers
   */
  registerModel(model: string, providerMappings: ModelProviderMapping[]): void;

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
   * Removes a model from the registry.
   * @param model - The model name
   * @returns true if model was removed, false if it didn't exist
   */
  unregisterModel(model: string): boolean;

  /**
   * Clears all model registrations.
   */
  clearRegistrations(): void;

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
}

export const I_MODEL_REGISTRY_TOKEN = Symbol('IModelRegistry');
