import { Injectable } from '@nestjs/common';

import { LLM_MODEL_REGISTRATIONS } from '../constants/model-registry.constant';
import { IModelRegistry } from '../contracts/i-model-registry.contract';
import { ModelProviderMapping } from '../types/model.type';

/**
 * Model registry service.
 * Manages mappings between model identifiers and their providers.
 * Supports multiple model identifiers for the same model with different providers.
 * Pre-populated with known model-provider mappings and does not allow runtime modifications.
 */
@Injectable()
export class ModelRegistryService implements IModelRegistry {
  // Bidirectional lookup: modelId -> provider
  // Used to find which provider owns a specific modelId
  // Example: 'openai/gpt-4' -> 'openai', 'anthropic/claude-3.5-sonnet' -> 'anthropic'
  private readonly modelIdToProvider: Map<
    ModelProviderMapping['modelId'],
    ModelProviderMapping['provider']
  > = new Map();

  // Bidirectional lookup: baseModel -> {provider -> modelId}
  // Used to find all providers for a baseModel and their specific modelIds
  // Example: 'gpt-4' -> {'openai': 'openai/gpt-4', 'azure': 'azure/gpt-4'}
  private readonly modelRegistrations: Map<
    string,
    Map<ModelProviderMapping['provider'], ModelProviderMapping['modelId']>
  > = new Map();

  constructor() {
    this.initializeDefaultMappings();
  }

  /**
   * Initializes registry with default model-provider mappings from unified constant.
   */
  private initializeDefaultMappings(): void {
    for (const registration of LLM_MODEL_REGISTRATIONS) {
      this.addProviderMapping(registration.baseModel, {
        modelId: registration.modelId,
        provider: registration.provider,
      });
    }
  }

  /**
   * Adds a provider mapping for a base model.
   * Used during initialization to build the registry maps.
   */
  private addProviderMapping(
    baseModel: string,
    mapping: ModelProviderMapping,
  ): void {
    if (!baseModel) {
      throw new Error('Model identifier is required');
    }

    const providerMap =
      this.modelRegistrations.get(baseModel) ??
      new Map<
        ModelProviderMapping['provider'],
        ModelProviderMapping['modelId']
      >();
    providerMap.set(mapping.provider, mapping.modelId);
    this.modelRegistrations.set(baseModel, providerMap);
    this.modelIdToProvider.set(mapping.modelId, mapping.provider);
  }

  /**
   * Gets all providers that support a given model.
   * Returns unique providers for all model identifiers of the model.
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

    // If no provider specified, check if model is available on any provider
    if (!provider) {
      return true;
    }

    return providerMap.has(provider);
  }

  /**
   * Gets all registered models.
   */
  getAllModels(): string[] {
    return Array.from(this.modelRegistrations.keys());
  }

  /**
   * Checks if a model is registered.
   */
  isModelRegistered(model: string): boolean {
    if (!model) {
      return false;
    }

    return this.modelRegistrations.has(model);
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
   * Resolves a model identifier (base model or provider-specific model ID) to a provider-specific model ID.
   * Accepts both base model names (e.g., 'gpt-4.1-mini') and provider-specific model IDs (e.g., 'openai/gpt-4.1-mini').
   * Always returns the provider-specific model ID.
   */
  resolveModelId(model: string, provider?: string): string | undefined {
    if (!model) {
      return undefined;
    }

    // First, check if the incoming value is a base model
    const providerMap = this.modelRegistrations.get(model);
    if (providerMap) {
      if (!provider) {
        // Base model without provider cannot be resolved
        return undefined;
      }
      return providerMap.get(provider);
    }

    // Check if the incoming model is a provider-specific model ID
    const modelIdProvider = this.modelIdToProvider.get(model);

    if (modelIdProvider) {
      // Incoming model is a provider-specific model ID
      if (provider) {
        if (provider === modelIdProvider) {
          // Provider matches, return the model ID itself
          return model;
        }
        // Provider doesn't match - extract base model and resolve to the specified provider
        const baseModel = model.split('/').slice(1).join('/');
        const baseModelProviderMap = this.modelRegistrations.get(baseModel);
        if (baseModelProviderMap) {
          return baseModelProviderMap.get(provider);
        }
        return undefined;
      }
      // No provider specified, return the model ID itself
      return model;
    }

    // No provider-specific entry found
    return undefined;
  }
}
