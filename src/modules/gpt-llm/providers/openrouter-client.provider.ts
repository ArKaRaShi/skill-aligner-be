import { Injectable, Logger } from '@nestjs/common';

import {
  createOpenRouter,
  OpenRouterProvider,
} from '@openrouter/ai-sdk-provider';
import {
  generateObject as AIGenerateObject,
  generateText as AIGenerateText,
} from 'ai';
import { z } from 'zod';

import {
  GenerateObjectInput,
  GenerateObjectOutput,
  GenerateTextInput,
  GenerateTextOutput,
  ILlmProviderClient,
} from '../contracts/i-llm-provider-client.contract';

@Injectable()
export class OpenRouterClientProvider implements ILlmProviderClient {
  private readonly openRouter: OpenRouterProvider;
  private readonly logger = new Logger(OpenRouterClientProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly baseURL: string,
  ) {
    this.openRouter = createOpenRouter({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
    });
  }

  async generateText({
    prompt,
    systemPrompt,
    model,
  }: GenerateTextInput): Promise<GenerateTextOutput> {
    const { text, usage, providerMetadata } = await AIGenerateText({
      model: this.openRouter(model),
      prompt,
      system: systemPrompt,
      temperature: 0,
      maxOutputTokens: 5000,
    });

    this.logger.log(
      `[${OpenRouterClientProvider.prototype.generateText.name}] usage: ${JSON.stringify(usage, null, 2)}\nproviderMetadata: ${JSON.stringify(providerMetadata, null, 2)}`,
    );

    return {
      text,
      model,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
    };
  }

  async generateObject<TSchema extends z.ZodTypeAny>({
    prompt,
    systemPrompt,
    schema,
    model,
  }: GenerateObjectInput<TSchema>): Promise<GenerateObjectOutput<TSchema>> {
    const { object, usage, providerMetadata } = await AIGenerateObject({
      model: this.openRouter(model),
      schema,
      prompt,
      system: systemPrompt,
      temperature: 0,
      maxOutputTokens: 5000,
    });

    this.logger.log(
      `[${OpenRouterClientProvider.prototype.generateObject.name}] usage: ${JSON.stringify(usage, null, 2)}\nproviderMetadata: ${JSON.stringify(providerMetadata, null, 2)}`,
    );

    return {
      model,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      object: object as z.infer<TSchema>,
    };
  }
}
