import { Injectable } from '@nestjs/common';

import {
  createOpenRouter,
  OpenRouterProvider,
} from '@openrouter/ai-sdk-provider';
import {
  generateObject as aiGenerateObject,
  generateText as aiGenerateText,
} from 'ai';
import { z } from 'zod';

import {
  LLM_HYPER_PARAMETERS,
  LLM_MAX_RETRIES_CONFIG,
  LLM_REQUEST_TIMEOUT,
} from '../constants/llm-config.constant';
import {
  GenerateObjectInput,
  GenerateObjectOutput,
  GenerateTextInput,
  GenerateTextOutput,
  ILlmProviderClient,
} from '../contracts/i-llm-provider-client.contract';
import { BaseLlmProvider } from './base-llm-provider.abstract';

/**
 * OpenRouter provider implementation for LLM services.
 * Supports multiple LLM providers through OpenRouter's unified API.
 */
@Injectable()
export class OpenRouterClientProvider
  extends BaseLlmProvider
  implements ILlmProviderClient
{
  private readonly openRouter: OpenRouterProvider;

  constructor(
    private readonly apiKey: string,
    private readonly baseURL: string,
  ) {
    super('OpenRouter');
    this.openRouter = createOpenRouter({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
    });
  }

  async generateText({
    prompt,
    systemPrompt,
    model,
    timeout,
  }: GenerateTextInput): Promise<GenerateTextOutput> {
    this.validateGenerateTextInput({ prompt, systemPrompt, model });

    // Use provided timeout or fall back to default
    const requestTimeout = timeout ?? LLM_REQUEST_TIMEOUT;

    return this.retryOnTimeout(
      async () => {
        const {
          text,
          usage,
          finishReason,
          warnings,
          providerMetadata,
          response,
        } = await aiGenerateText({
          model: this.openRouter(model),
          prompt,
          system: systemPrompt,
          abortSignal: AbortSignal.timeout(requestTimeout),
          ...LLM_MAX_RETRIES_CONFIG,
          ...LLM_HYPER_PARAMETERS,
        });

        // Optional: Log method call for debugging
        // this.logMethodCall(
        //   OpenRouterClientProvider.prototype.generateText.name,
        //   usage,
        //   {},
        //   {},
        // );

        return {
          text,
          model,
          provider: this.getProviderName(),
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          finishReason,
          warnings,
          providerMetadata,
          response,
          hyperParameters: LLM_HYPER_PARAMETERS,
        };
      },
      {
        operationName: 'generateText',
        model,
      },
    );
  }

  async generateObject<TSchema extends z.ZodTypeAny>({
    prompt,
    systemPrompt,
    schema,
    model,
    timeout,
  }: GenerateObjectInput<TSchema>): Promise<GenerateObjectOutput<TSchema>> {
    this.validateGenerateObjectInput({ prompt, systemPrompt, schema, model });

    // Use provided timeout or fall back to default
    const requestTimeout = timeout ?? LLM_REQUEST_TIMEOUT;

    return this.retryOnTimeout(
      async () => {
        const {
          object,
          usage,
          finishReason,
          warnings,
          providerMetadata,
          response,
        } = await aiGenerateObject({
          model: this.openRouter(model),
          schema,
          prompt,
          system: systemPrompt,
          abortSignal: AbortSignal.timeout(requestTimeout),
          ...LLM_MAX_RETRIES_CONFIG,
          ...LLM_HYPER_PARAMETERS,
        });

        // Optional: Log method call for debugging
        // this.logMethodCall(
        //   OpenRouterClientProvider.prototype.generateObject.name,
        //   usage,
        //   {},
        //   {},
        // );

        return {
          model,
          provider: this.getProviderName(),
          inputTokens: usage?.inputTokens ?? 0,
          outputTokens: usage?.outputTokens ?? 0,
          object: object as z.infer<TSchema>,
          finishReason,
          warnings,
          providerMetadata,
          response,
          hyperParameters: LLM_HYPER_PARAMETERS,
        };
      },
      {
        operationName: 'generateObject',
        model,
      },
    );
  }
}
