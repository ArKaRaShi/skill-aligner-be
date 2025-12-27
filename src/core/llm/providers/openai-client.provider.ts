import { Injectable } from '@nestjs/common';

import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai';
import {
  generateObject as aiGenerateObject,
  generateText as aiGenerateText,
} from 'ai';
import { z } from 'zod';

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
  }: GenerateTextInput): Promise<GenerateTextOutput> {
    this.validateGenerateTextInput({ prompt, systemPrompt, model });

    const hyperParameters = {
      temperature: 0,
      maxOutputTokens: 10_000,
    };

    try {
      const { text, usage } = await aiGenerateText({
        model: this.openai(model),
        prompt,
        system: systemPrompt,
        maxRetries: 1,
        ...hyperParameters,
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
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        hyperParameters,
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
  }: GenerateObjectInput<TSchema>): Promise<GenerateObjectOutput<TSchema>> {
    this.validateGenerateObjectInput({ prompt, systemPrompt, schema, model });

    const hyperParameters = {
      temperature: 0,
      maxOutputTokens: 10_000,
    };

    try {
      const { object, usage } = await aiGenerateObject({
        model: this.openai(model),
        schema,
        prompt,
        system: systemPrompt,
        maxRetries: 1,
        ...hyperParameters,
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
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        object: object as z.infer<TSchema>,
        hyperParameters,
      };
    } catch (error) {
      throw this.createProviderError('generate object', model, error as Error);
    }
  }
}
