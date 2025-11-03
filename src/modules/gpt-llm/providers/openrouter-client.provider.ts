import { Injectable } from '@nestjs/common';

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
  GenerateObjectParams,
  GenerateTextParams,
  ILlmProviderClient,
} from '../contracts/i-llm-provider-client.contract';

@Injectable()
export class OpenRouterClientProvider implements ILlmProviderClient {
  private readonly openRouter: OpenRouterProvider;

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
  }: GenerateTextParams): Promise<string> {
    const { text, usage } = await AIGenerateText({
      model: this.openRouter(model),
      prompt,
      system: systemPrompt,
      temperature: 0,
      maxOutputTokens: 5000,
    });

    console.log(
      'OpenRouter generateText usage:',
      JSON.stringify(usage, null, 2),
    );
    return text;
  }

  async generateObject<TSchema extends z.ZodTypeAny>({
    prompt,
    systemPrompt,
    schema,
    model,
  }: GenerateObjectParams<TSchema>): Promise<z.infer<TSchema>> {
    const { object, usage, providerMetadata } = await AIGenerateObject({
      model: this.openRouter(model),
      schema,
      prompt,
      system: systemPrompt,
      temperature: 0,
      maxOutputTokens: 5000,
    });
    console.log(
      'OpenRouter generateObject usage:',
      JSON.stringify(usage, null, 2),
    );
    console.log(
      'OpenRouter generateObject providerMetadata:',
      JSON.stringify(providerMetadata, null, 2),
    );
    return object as z.infer<TSchema>;
  }
}
