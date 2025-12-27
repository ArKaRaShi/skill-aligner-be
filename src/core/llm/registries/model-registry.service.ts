import { Injectable } from '@nestjs/common';

import { IModelRegistry } from '../contracts/i-model-registry.contract';
import { LLM_MODEL_REGISTRATIONS, ModelProviderMapping } from '../models';

/**
 * Model registry service.
 * Manages mappings between model identifiers and their providers.
 * Supports multiple model identifiers for the same model with different providers.
 * Pre-populated with known model-provider mappings, but supports dynamic registration.
 */
@Injectable()
export class ModelRegistryService implements IModelRegistry {
  private readonly modelIdToProvider: Map<string, string> = new Map();
  private readonly modelToModelIds: Map<string, string[]> = new Map();

  constructor() {
    this.initializeDefaultMappings();
  }

  /**
   * Initializes registry with default model-provider mappings from unified constant.
   */
  private initializeDefaultMappings(): void {
    // Group registrations by base model
    const modelToMappings = new Map<string, ModelProviderMapping[]>();
    for (const registration of LLM_MODEL_REGISTRATIONS) {
      if (!modelToMappings.has(registration.baseModel)) {
        modelToMappings.set(registration.baseModel, []);
      }
      modelToMappings.get(registration.baseModel)!.push({
        modelId: registration.modelId,
        provider: registration.provider,
      });
    }

    // Register each model with its mappings
    for (const [model, providerMappings] of modelToMappings.entries()) {
      this.registerModel(model, providerMappings);
    }
  }

  /**
   * Registers a model with its provider-specific model identifiers.
   * Overwrites existing registration if model already exists.
   */
  registerModel(model: string, providerMappings: ModelProviderMapping[]): void {
    if (!model) {
      throw new Error('Model identifier is required');
    }

    if (!providerMappings || providerMappings.length === 0) {
      throw new Error(
        `At least one model identifier must be specified for model '${model}'`,
      );
    }

    // Remove existing model identifiers for this model
    const existingModelIds = this.modelToModelIds.get(model);
    if (existingModelIds) {
      for (const modelId of existingModelIds) {
        this.modelIdToProvider.delete(modelId);
      }
    }

    // Register new model identifiers
    const modelIds: string[] = [];
    for (const mapping of providerMappings) {
      this.modelIdToProvider.set(mapping.modelId, mapping.provider);
      modelIds.push(mapping.modelId);
    }

    this.modelToModelIds.set(model, modelIds);
  }

  /**
   * Gets all providers that support a given model.
   * Returns unique providers for all model identifiers of the model.
   */
  getProvidersForModel(model: string): string[] {
    if (!model) {
      throw new Error('Model identifier is required');
    }

    const modelIds = this.modelToModelIds.get(model);
    if (!modelIds) {
      return [];
    }

    const providers = new Set<string>();
    for (const modelId of modelIds) {
      const provider = this.modelIdToProvider.get(modelId);
      if (provider) {
        providers.add(provider);
      }
    }

    return Array.from(providers);
  }

  /**
   * Checks if a model is available on a specific provider.
   */
  isModelAvailable(model: string, provider?: string): boolean {
    if (!model) {
      return false;
    }

    const modelIds = this.modelToModelIds.get(model);

    if (!modelIds || modelIds.length === 0) {
      return false;
    }

    // If no provider specified, check if model is available on any provider
    if (!provider) {
      return true;
    }

    // Check if any model identifier is available on the specified provider
    for (const modelId of modelIds) {
      const modelIdProvider = this.modelIdToProvider.get(modelId);
      if (modelIdProvider === provider) {
        return true;
      }
    }

    return false;
  }

  /**
   * Gets all registered models.
   */
  getAllModels(): string[] {
    return Array.from(this.modelToModelIds.keys());
  }

  /**
   * Checks if a model is registered.
   */
  isModelRegistered(model: string): boolean {
    if (!model) {
      return false;
    }

    return this.modelToModelIds.has(model);
  }

  /**
   * Removes a model from the registry.
   */
  unregisterModel(model: string): boolean {
    const modelIds = this.modelToModelIds.get(model);
    if (!modelIds) {
      return false;
    }

    for (const modelId of modelIds) {
      this.modelIdToProvider.delete(modelId);
    }

    this.modelToModelIds.delete(model);
    return true;
  }

  /**
   * Clears all model registrations.
   */
  clearRegistrations(): void {
    this.modelToModelIds.clear();
    this.modelIdToProvider.clear();
  }

  /**
   * Gets the total number of registered models.
   */
  getModelCount(): number {
    return this.modelToModelIds.size;
  }

  /**
   * Gets all models available on a specific provider.
   */
  getModelsForProvider(provider: string): string[] {
    if (!provider) {
      throw new Error('Provider name is required');
    }

    const models: string[] = [];

    for (const [model, modelIds] of this.modelToModelIds.entries()) {
      for (const modelId of modelIds) {
        const modelIdProvider = this.modelIdToProvider.get(modelId);
        if (modelIdProvider === provider) {
          models.push(model);
          break;
        }
      }
    }

    return models;
  }

  /**
   * Gets the provider for a specific model identifier.
   */
  getProviderForModelId(modelId: string): string | undefined {
    return this.modelIdToProvider.get(modelId);
  }

  /**
   * Gets all model identifiers for a model.
   */
  getModelIdsForModel(model: string): string[] {
    const modelIds = this.modelToModelIds.get(model);
    return modelIds ? [...modelIds] : [];
  }
}
