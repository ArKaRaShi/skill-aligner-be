import { Injectable } from '@nestjs/common';

import { IModelRegistry } from '../../llm/contracts/i-model-registry.contract';
import { EMBEDDING_MODEL_REGISTRATIONS } from '../constants/embedding-models.constant';
import { EmbeddingModelRegistration } from '../types/embedding.type';

/**
 * Embedding model registry service.
 * Manages mappings between embedding model identifiers and their providers.
 * Supports dimension lookup in addition to provider resolution.
 * Pre-populated with known model-provider mappings.
 */
@Injectable()
export class EmbeddingModelRegistryService implements IModelRegistry {
  // modelId -> provider mapping
  private readonly modelIdToProvider: Map<string, string> = new Map();

  // baseModel -> {provider -> modelId} mapping
  private readonly modelRegistrations: Map<string, Map<string, string>> =
    new Map();

  // modelId -> dimension mapping
  private readonly modelIdToDimension: Map<string, number> = new Map();

  // baseModel -> dimension mapping (for dimension lookup by base model)
  private readonly baseModelToDimension: Map<string, number> = new Map();

  // dimension -> [baseModel] mapping (for reverse lookup)
  private readonly dimensionToModels: Map<number, string[]> = new Map();

  // Full registration data for cost lookup
  private readonly registrations: EmbeddingModelRegistration[] = [];

  constructor() {
    this.initializeDefaultMappings();
  }

  /**
   * Initializes registry with default model-provider mappings from constant.
   */
  private initializeDefaultMappings(): void {
    for (const registration of EMBEDDING_MODEL_REGISTRATIONS) {
      this.addRegistration(registration);
    }
  }

  /**
   * Adds a model registration to all lookup maps.
   */
  private addRegistration(registration: EmbeddingModelRegistration): void {
    const { baseModel, modelId, provider, dimension } = registration;

    // Store full registration
    this.registrations.push(registration);

    // modelId -> provider
    this.modelIdToProvider.set(modelId, provider);

    // baseModel -> {provider -> modelId}
    const providerMap =
      this.modelRegistrations.get(baseModel) ?? new Map<string, string>();
    providerMap.set(provider, modelId);
    this.modelRegistrations.set(baseModel, providerMap);

    // modelId -> dimension
    this.modelIdToDimension.set(modelId, dimension);

    // baseModel -> dimension
    this.baseModelToDimension.set(baseModel, dimension);

    // dimension -> [baseModel]
    const models = this.dimensionToModels.get(dimension) ?? [];
    if (!models.includes(baseModel)) {
      models.push(baseModel);
      this.dimensionToModels.set(dimension, models);
    }
  }

  /**
   * Gets all providers that support a given model.
   */
  getProvidersForModel(model: string): string[] {
    if (!model) {
      throw new Error('Model identifier is required');
    }

    const providerMap = this.modelRegistrations.get(model);
    if (!providerMap) {
      return [];
    }

    return Array.from(providerMap.keys());
  }

  /**
   * Checks if a model is available on a specific provider.
   */
  isModelAvailable(model: string, provider?: string): boolean {
    if (!model) {
      return false;
    }

    const providerMap = this.modelRegistrations.get(model);
    if (!providerMap || providerMap.size === 0) {
      return false;
    }

    if (!provider) {
      return true;
    }

    return providerMap.has(provider);
  }

  /**
   * Checks if a model is registered.
   * Required by IModelRegistry interface.
   */
  isModelRegistered(model: string): boolean {
    if (!model) {
      return false;
    }

    const providerMap = this.modelRegistrations.get(model);
    return !!providerMap && providerMap.size > 0;
  }

  /**
   * Gets all registered models.
   */
  getAllModels(): string[] {
    return Array.from(this.modelRegistrations.keys());
  }

  /**
   * Gets the total number of registered models.
   */
  getModelCount(): number {
    return this.modelRegistrations.size;
  }

  /**
   * Gets all models available on a specific provider.
   */
  getModelsForProvider(provider: string): string[] {
    if (!provider) {
      throw new Error('Provider name is required');
    }

    const models: string[] = [];

    for (const [model, providerMap] of this.modelRegistrations.entries()) {
      if (providerMap.has(provider)) {
        models.push(model);
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
    const providerMap = this.modelRegistrations.get(model);
    return providerMap ? Array.from(providerMap.values()) : [];
  }

  /**
   * Gets the provider-specific model identifier for a given model and provider.
   */
  getModelIdForProvider(model: string, provider: string): string | undefined {
    if (!model || !provider) {
      return undefined;
    }

    const providerMap = this.modelRegistrations.get(model);
    return providerMap?.get(provider);
  }

  /**
   * Resolves a model identifier to a provider-specific model ID.
   */
  resolveModelId(model: string, provider?: string): string | undefined {
    if (!model) {
      return undefined;
    }

    // Check if base model
    const providerMap = this.modelRegistrations.get(model);
    if (providerMap) {
      if (!provider) {
        return undefined;
      }
      return providerMap.get(provider);
    }

    // Check if provider-specific model ID
    const modelIdProvider = this.modelIdToProvider.get(model);
    if (modelIdProvider) {
      if (provider) {
        if (provider === modelIdProvider) {
          return model;
        }
        // Try to find base model and resolve to different provider
        const parts = model.split('/');
        const baseModel = parts.slice(1).join('/');
        const baseModelProviderMap = this.modelRegistrations.get(baseModel);
        if (baseModelProviderMap) {
          return baseModelProviderMap.get(provider);
        }
        return undefined;
      }
      return model;
    }

    return undefined;
  }

  /**
   * Gets dimension for a base model.
   */
  getDimensionByModel(model: string): number | undefined {
    return this.baseModelToDimension.get(model);
  }

  /**
   * Gets dimension for a provider-specific model ID.
   */
  getDimensionByModelId(modelId: string): number | undefined {
    return this.modelIdToDimension.get(modelId);
  }

  /**
   * Gets all models with a given dimension.
   */
  getModelByDimension(dimension: number): string[] {
    return this.dimensionToModels.get(dimension) ?? [];
  }

  /**
   * Gets full registration data for a model.
   */
  getRegistration(model: string): EmbeddingModelRegistration | undefined {
    return this.registrations.find((r) => r.baseModel === model);
  }

  /**
   * Gets full registration data by model ID.
   */
  getRegistrationByModelId(
    modelId: string,
  ): EmbeddingModelRegistration | undefined {
    return this.registrations.find((r) => r.modelId === modelId);
  }
}
