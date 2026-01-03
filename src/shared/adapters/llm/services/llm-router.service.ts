import { Injectable, Logger } from '@nestjs/common';

import { z } from 'zod';

import {
  GenerateObjectInput,
  GenerateObjectOutput,
  GenerateTextInput,
  GenerateTextOutput,
  ILlmProviderClient,
} from '../contracts/i-llm-provider-client.contract';
import { ILlmRouterService } from '../contracts/i-llm-router-service.contract';
import { IModelRegistry } from '../contracts/i-model-registry.contract';
import { IProviderRegistry } from '../contracts/i-provider-registry.contract';

/**
 * LLM router service.
 * Routes LLM requests to appropriate providers based on model and optional provider selection.
 *
 * Provider Selection Logic:
 * 1. If provider is specified, use that provider (validate availability)
 * 2. If provider is not specified, use the first available provider from the model registry
 *    (providers are checked in registration order: openrouter first, then openai, etc.)
 * 3. If no provider supports the model, throw an error
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
   * Provider Selection Logic:
   * 1. If provider is specified, use that provider (validate availability)
   * 2. If provider is not specified and model is base name, use first available provider from registry
   * 3. If provider is not specified and model contains "/" (provider-prefixed), reject it
   *
   * @param model - The model identifier (base model name only, e.g., 'gpt-4.1-mini')
   * @param provider - Optional provider name
   * @returns Object containing the resolved provider instance and provider-specific model ID
   * @throws Error if provider not found, model not available, or provider-prefixed model used without explicit provider
   */
  private resolveProviderAndModel(
    model: string,
    provider?: string,
  ): { selectedProvider: ILlmProviderClient; resolvedModel: string } {
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
}
