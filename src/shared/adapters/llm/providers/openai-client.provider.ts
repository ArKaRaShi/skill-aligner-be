import { Injectable } from '@nestjs/common';

import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
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
 * OpenAI provider implementation for LLM services.
 * Supports OpenAI's GPT models via the official OpenAI API.
 */
@Injectable()
export class OpenAIClientProvider
  extends BaseLlmProvider
  implements ILlmProviderClient
{
  private readonly openai: OpenAIProvider;

  constructor(private readonly apiKey: string) {
    super('OpenAI');
    this.openai = createOpenAI({
      apiKey: this.apiKey,
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

    try {
      const { text, usage, finishReason, warnings, response } =
        await aiGenerateText({
          model: this.openai(model),
          prompt,
          system: systemPrompt,
          abortSignal: AbortSignal.timeout(requestTimeout),
          ...LLM_MAX_RETRIES_CONFIG,
          ...LLM_HYPER_PARAMETERS,
        });

      // Optional: Log method call for debugging
      // this.logMethodCall(
      //   OpenAIClientProvider.prototype.generateText.name,
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
        providerMetadata: undefined,
        response,
        hyperParameters: LLM_HYPER_PARAMETERS,
      };
    } catch (error) {
      throw this.createProviderError('generate text', model, error as Error);
    }
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

    try {
      const { object, usage, finishReason, warnings, response } =
        await aiGenerateObject({
          model: this.openai(model),
          schema,
          prompt,
          system: systemPrompt,
          abortSignal: AbortSignal.timeout(requestTimeout),
          ...LLM_MAX_RETRIES_CONFIG,
          ...LLM_HYPER_PARAMETERS,
        });

      // Optional: Log method call for debugging
      // this.logMethodCall(
      //   OpenAIClientProvider.prototype.generateObject.name,
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
        providerMetadata: undefined,
        response,
        hyperParameters: LLM_HYPER_PARAMETERS,
      };
    } catch (error) {
      throw this.createProviderError('generate object', model, error as Error);
    }
  }
}
