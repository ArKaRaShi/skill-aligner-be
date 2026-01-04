import { Injectable, Logger } from '@nestjs/common';

import { IModelRegistry } from '../../../adapters/llm/contracts/i-model-registry.contract';
import { IEmbeddingClient } from '../contracts/i-embedding-client.contract';
import { IEmbeddingProviderRegistry } from '../contracts/i-embedding-provider-registry.contract';
import {
  EmbedManyRouterParams,
  EmbedOneRouterParams,
  IEmbeddingRouterService,
} from '../contracts/i-embedding-router-service.contract';
import { EmbedResult } from '../providers/base-embedding-provider.abstract';

/**
 * Embedding router service.
 * Routes embedding requests to appropriate providers based on model and optional provider selection.
 *
 * Provider Selection Logic (same as LLM):
 * 1. If provider is specified, use that provider (validate availability)
 * 2. If provider is not specified, use the first available provider from the model registry
 * 3. If no provider supports the model, throw an error
 */
@Injectable()
export class EmbeddingRouterService implements IEmbeddingRouterService {
  private readonly logger = new Logger(EmbeddingRouterService.name);

  constructor(
    private readonly providerRegistry: IEmbeddingProviderRegistry,
    private readonly modelRegistry: IModelRegistry,
  ) {}

  /**
   * Embeds a single text using the specified model.
   */
  async embedOne(params: EmbedOneRouterParams): Promise<EmbedResult> {
    const { text, model, provider, role } = params;
    const { selectedProvider, resolvedModel } = this.resolveProviderAndModel(
      model,
      provider,
    );

    this.logger.debug(
      `Routing embedOne for model '${model}' to provider '${this.getProviderName(selectedProvider)}' using model ID '${resolvedModel}'`,
    );

    return selectedProvider.embedOne({
      text,
      role,
    });
  }

  /**
   * Embeds multiple texts using the specified model.
   */
  async embedMany(params: EmbedManyRouterParams): Promise<EmbedResult[]> {
    const { texts, model, provider, role } = params;
    const { selectedProvider, resolvedModel } = this.resolveProviderAndModel(
      model,
      provider,
    );

    this.logger.debug(
      `Routing embedMany for model '${model}' to provider '${this.getProviderName(selectedProvider)}' using model ID '${resolvedModel}'`,
    );

    return selectedProvider.embedMany({
      texts,
      role,
    });
  }

  /**
   * Resolves to appropriate provider and provider-specific model ID.
   *
   * Provider Selection Logic:
   * 1. If provider is specified, use that provider (validate availability)
   * 2. If provider is not specified and model is base name, use first available provider from registry
   * 3. If provider is not specified and model contains "/" (provider-prefixed), reject it
   *
   * @param model - The model identifier (base model name only, e.g., 'e5-base')
   * @param provider - Optional provider name
   * @returns Object containing the resolved provider instance and provider-specific model ID
   * @throws Error if provider not found, model not available, or provider-prefixed model used without explicit provider
   */
  private resolveProviderAndModel(
    model: string,
    provider?: string,
  ): { selectedProvider: IEmbeddingClient; resolvedModel: string } {
    let providerName: string;

    // If provider is explicitly specified, use it
    if (provider) {
      providerName = provider;
      // Validate provider exists
      if (!this.providerRegistry.hasProvider(providerName)) {
        const availableProviders = this.providerRegistry.getAllProviders();
        throw new Error(
          `Provider '${providerName}' not found. Available providers: ${availableProviders.join(', ') || 'none'}`,
        );
      }
    } else {
      // Provider not specified - reject provider-prefixed model IDs
      if (model.includes('/')) {
        throw new Error(
          `Provider-prefixed model IDs like '${model}' are not allowed without explicit provider parameter. Use base model name '${model.split('/').slice(1).join('/')}' instead, or specify the provider explicitly.`,
        );
      }

      // Base model name - use the first available provider from the model registry
      const availableProvidersForModel =
        this.modelRegistry.getProvidersForModel(model);

      if (availableProvidersForModel.length === 0) {
        const availableModels = this.modelRegistry.getAllModels();
        throw new Error(
          `Model '${model}' is not supported by any registered provider. Available models: ${availableModels.join(', ') || 'none'}`,
        );
      }

      providerName = availableProvidersForModel[0]; // Use first available provider
    }

    // Resolve model ID using the model registry
    const resolvedModel = this.modelRegistry.resolveModelId(
      model,
      providerName,
    );

    if (!resolvedModel) {
      const availableProvidersForModel =
        this.modelRegistry.getProvidersForModel(model);
      throw new Error(
        `Model '${model}' is not available on provider '${providerName}'. Available providers for this model: ${availableProvidersForModel.join(', ')}`,
      );
    }

    // Get the provider for the resolved model ID
    const modelIdProvider =
      this.modelRegistry.getProviderForModelId(resolvedModel);
    if (!modelIdProvider) {
      throw new Error(
        `Failed to determine provider for resolved model ID '${resolvedModel}'`,
      );
    }

    // Verify the resolved model ID belongs to the expected provider
    if (modelIdProvider !== providerName) {
      throw new Error(
        `Model '${model}' resolved to provider '${modelIdProvider}', but expected '${providerName}'`,
      );
    }

    const selectedProvider = this.providerRegistry.getProvider(providerName);

    return { selectedProvider, resolvedModel };
  }

  private getProviderName(_provider: IEmbeddingClient): string {
    // For now, return a generic name since IEmbeddingClient doesn't expose getProviderName()
    // This can be refined if providers extend a base class with that method
    return 'embedding-provider';
  }
}
