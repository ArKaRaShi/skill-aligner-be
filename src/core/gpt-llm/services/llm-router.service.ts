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
   * Generates a raw text completion using the specified model and prompts.
   */
  async generateText(
    { prompt, systemPrompt, model }: GenerateTextInput,
    provider?: string,
  ): Promise<GenerateTextOutput> {
    const selectedProvider = this.resolveProvider(model, provider);
    this.logger.debug(
      `Routing generateText for model '${model}' to provider '${selectedProvider.getProviderName()}'`,
    );

    return selectedProvider.generateText({
      prompt,
      systemPrompt,
      model,
    });
  }

  /**
   * Generates a structured object by asking the model to fill a Zod schema.
   */
  async generateObject<TSchema extends z.ZodTypeAny>(
    { prompt, systemPrompt, schema, model }: GenerateObjectInput<TSchema>,
    provider?: string,
  ): Promise<GenerateObjectOutput<TSchema>> {
    const selectedProvider = this.resolveProvider(model, provider);
    this.logger.debug(
      `Routing generateObject for model '${model}' to provider '${selectedProvider.getProviderName()}'`,
    );

    return selectedProvider.generateObject({
      prompt,
      systemPrompt,
      schema,
      model,
    });
  }

  /**
   * Resolves the appropriate provider for a given model and optional provider parameter.
   *
   * @param model - The model identifier
   * @param provider - Optional provider name
   * @returns The resolved provider instance
   * @throws Error if provider not found or model not available on provider
   */
  private resolveProvider(
    model: string,
    provider?: string,
  ): ILlmProviderClient {
    // Validate model is registered
    if (!this.modelRegistry.isModelRegistered(model)) {
      const availableModels = this.modelRegistry.getAllModels();
      throw new Error(
        `Model '${model}' is not registered. Available models: ${availableModels.join(', ') || 'none'}`,
      );
    }

    // Determine which provider to use
    const providerName = provider || DEFAULT_PROVIDER;

    // Validate provider exists
    if (!this.providerRegistry.hasProvider(providerName)) {
      const availableProviders = this.providerRegistry.getAllProviders();
      throw new Error(
        `Provider '${providerName}' not found. Available providers: ${availableProviders.join(', ') || 'none'}`,
      );
    }

    // Validate model is available on the provider
    if (!this.modelRegistry.isModelAvailable(model, providerName)) {
      const availableProvidersForModel =
        this.modelRegistry.getProvidersForModel(model);
      throw new Error(
        `Model '${model}' is not available on provider '${providerName}'. Available providers for this model: ${availableProvidersForModel.join(', ') || 'none'}`,
      );
    }

    return this.providerRegistry.getProvider(providerName);
  }
}
