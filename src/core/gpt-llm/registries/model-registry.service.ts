import { Injectable, Logger } from '@nestjs/common';

import { IModelRegistry } from '../contracts/i-model-registry.contract';

/**
 * Default model-provider mappings.
 * Maps models to providers that support them.
 * Only includes models that have cost data available in token-cost-calculator.helper.ts
 */
const DEFAULT_MODEL_PROVIDER_MAPPINGS: Record<string, string[]> = {
  // OpenAI models (from token-cost-calculator)
  'openai/gpt-4o-mini': ['openai', 'openrouter'],
  'openai/gpt-4.1-mini': ['openai', 'openrouter'],
  'openai/gpt-4.1-nano': ['openai', 'openrouter'],
  'openai/gpt-oss-120b': ['openrouter'],

  // Google models (from token-cost-calculator)
  'google/gemini-2.5-flash': ['openrouter'],
  'google/gemini-2.0-flash-001': ['openrouter'],
};

/**
 * Model registry service.
 * Manages mappings between models and their available providers.
 * Pre-populated with known model-provider mappings, but supports dynamic registration.
 */
@Injectable()
export class ModelRegistryService implements IModelRegistry {
  private readonly logger = new Logger(ModelRegistryService.name);
  private readonly modelToProviders: Map<string, string[]> = new Map();

  constructor() {
    this.initializeDefaultMappings();
  }

  /**
   * Initializes the registry with default model-provider mappings.
   */
  private initializeDefaultMappings(): void {
    this.logger.log('Initializing default model-provider mappings');

    for (const [model, providers] of Object.entries(
      DEFAULT_MODEL_PROVIDER_MAPPINGS,
    )) {
      this.registerModel(model, providers);
    }

    this.logger.log(
      `Registered ${this.modelToProviders.size} models with default mappings`,
    );
  }

  /**
   * Registers a model with its available providers.
   * Overwrites existing registration if model already exists.
   */
  registerModel(model: string, providers: string[]): void {
    if (!model) {
      throw new Error('Model identifier is required');
    }

    if (!providers || providers.length === 0) {
      throw new Error(
        `At least one provider must be specified for model '${model}'`,
      );
    }

    // Remove duplicates
    const uniqueProviders = [...new Set(providers)];

    this.modelToProviders.set(model, uniqueProviders);
    this.logger.debug(
      `Registered model '${model}' with providers: ${uniqueProviders.join(', ')}`,
    );
  }

  /**
   * Gets all providers that support a given model.
   */
  getProvidersForModel(model: string): string[] {
    if (!model) {
      throw new Error('Model identifier is required');
    }

    const providers = this.modelToProviders.get(model);
    return providers ? [...providers] : [];
  }

  /**
   * Checks if a model is available on a specific provider.
   */
  isModelAvailable(model: string, provider?: string): boolean {
    if (!model) {
      return false;
    }

    const providers = this.modelToProviders.get(model);

    if (!providers || providers.length === 0) {
      return false;
    }

    // If no provider specified, check if model is available on any provider
    if (!provider) {
      return true;
    }

    return providers.includes(provider);
  }

  /**
   * Gets all registered models.
   */
  getAllModels(): string[] {
    return Array.from(this.modelToProviders.keys());
  }

  /**
   * Checks if a model is registered.
   */
  isModelRegistered(model: string): boolean {
    if (!model) {
      return false;
    }

    return this.modelToProviders.has(model);
  }

  /**
   * Removes a model from the registry.
   */
  unregisterModel(model: string): boolean {
    if (this.modelToProviders.delete(model)) {
      this.logger.debug(`Unregistered model '${model}'`);
      return true;
    }
    return false;
  }

  /**
   * Clears all model registrations.
   */
  clearRegistrations(): void {
    const count = this.modelToProviders.size;
    this.modelToProviders.clear();
    this.logger.log(`Cleared ${count} model registrations`);
  }

  /**
   * Gets the total number of registered models.
   */
  getModelCount(): number {
    return this.modelToProviders.size;
  }

  /**
   * Gets all models available on a specific provider.
   */
  getModelsForProvider(provider: string): string[] {
    if (!provider) {
      throw new Error('Provider name is required');
    }

    const models: string[] = [];

    for (const [model, providers] of this.modelToProviders.entries()) {
      if (providers.includes(provider)) {
        models.push(model);
      }
    }

    return models;
  }
}
