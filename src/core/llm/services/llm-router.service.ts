import { Injectable, Logger } from '@nestjs/common';

import { z } from 'zod';

import {
  GenerateObjectInput,
  GenerateObjectOutput,
  GenerateTextInput,
  GenerateTextOutput,
  ILlmProviderClient,
} from '../contracts/i-llm-provider-client.contract';
import {
  DEFAULT_PROVIDER,
  ILlmRouterService,
} from '../contracts/i-llm-router-service.contract';
import { IModelRegistry } from '../contracts/i-model-registry.contract';
import { IProviderRegistry } from '../contracts/i-provider-registry.contract';

/**
 * LLM router service.
 * Routes LLM requests to appropriate providers based on model and optional provider selection.
 *
 * Provider Selection Logic:
 * 1. If provider is specified, use that provider (validate availability)
 * 2. If provider is not specified, fallback to OpenRouter
 * 3. Validate model is available on selected provider
 * 4. Throw descriptive errors for invalid configurations
 */
@Injectable()
export class LlmRouterService implements ILlmRouterService {
  private readonly logger = new Logger(LlmRouterService.name);

  constructor(
    private readonly providerRegistry: IProviderRegistry,
    private readonly modelRegistry: IModelRegistry,
  ) {}

  /**
   * Generates a raw text completion using specified model and prompts.
   */
  async generateText(
    { prompt, systemPrompt, model }: GenerateTextInput,
    provider?: string,
  ): Promise<GenerateTextOutput> {
    const { selectedProvider, resolvedModel } = this.resolveProviderAndModel(
      model,
      provider,
    );
    this.logger.debug(
      `Routing generateText for model '${model}' to provider '${selectedProvider.getProviderName()}' using model ID '${resolvedModel}'`,
    );

    return selectedProvider.generateText({
      prompt,
      systemPrompt,
      model: resolvedModel,
    });
  }

  /**
   * Generates a structured object by asking model to fill a Zod schema.
   */
  async generateObject<TSchema extends z.ZodTypeAny>(
    { prompt, systemPrompt, schema, model }: GenerateObjectInput<TSchema>,
    provider?: string,
  ): Promise<GenerateObjectOutput<TSchema>> {
    const { selectedProvider, resolvedModel } = this.resolveProviderAndModel(
      model,
      provider,
    );
    this.logger.debug(
      `Routing generateObject for model '${model}' to provider '${selectedProvider.getProviderName()}' using model ID '${resolvedModel}'`,
    );

    return selectedProvider.generateObject({
      prompt,
      systemPrompt,
      schema,
      model: resolvedModel,
    });
  }

  /**
   * Resolves to appropriate provider and provider-specific model ID for a given model and optional provider parameter.
   *
   * Accepts both base model names (e.g., 'gpt-4.1-mini') and provider-specific model IDs (e.g., 'openai/gpt-4.1-mini').
   * Always resolves to the provider-specific model ID.
   *
   * @param model - The model identifier (base model name or provider-specific model ID)
   * @param provider - Optional provider name
   * @returns Object containing the resolved provider instance and provider-specific model ID
   * @throws Error if provider not found or model not available on provider
   */
  private resolveProviderAndModel(
    model: string,
    provider?: string,
  ): { selectedProvider: ILlmProviderClient; resolvedModel: string } {
    // Determine which provider to use
    const providerName = provider || DEFAULT_PROVIDER;

    // Validate provider exists first
    if (!this.providerRegistry.hasProvider(providerName)) {
      const availableProviders = this.providerRegistry.getAllProviders();
      throw new Error(
        `Provider '${providerName}' not found. Available providers: ${availableProviders.join(', ') || 'none'}`,
      );
    }

    // Resolve model ID using the model registry (handles both base model and model ID)
    const resolvedModel = this.modelRegistry.resolveModelId(
      model,
      providerName,
    );

    if (!resolvedModel) {
      // If model is not a model ID, check if it's a base model
      if (!this.modelRegistry.isModelRegistered(model)) {
        const availableModels = this.modelRegistry.getAllModels();
        throw new Error(
          `Model '${model}' is not registered. Available models: ${availableModels.join(', ') || 'none'}`,
        );
      }
      // Model is registered but provider not available or base model without provider
      const availableProvidersForModel =
        this.modelRegistry.getProvidersForModel(model);
      if (availableProvidersForModel.length === 0) {
        throw new Error(
          `Model '${model}' is registered but has no available providers. Please check the model registry configuration.`,
        );
      }
      if (!provider) {
        throw new Error(
          `Model '${model}' is a base model and requires a provider. Available providers: ${availableProvidersForModel.join(', ')}`,
        );
      }
      throw new Error(
        `Model '${model}' is not available on provider '${providerName}'. Available providers for this model: ${availableProvidersForModel.join(', ')}`,
      );
    }

    // Get the provider for the resolved model ID (should match the providerName)
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
}
