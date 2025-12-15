import { Injectable, Logger } from '@nestjs/common';

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
    const hyperParameters = {
      temperature: 0,
      maxOutputTokens: 10_000,
    };

    const { text, usage, providerMetadata, request } = await aiGenerateText({
      model: this.openRouter(model),
      prompt,
      system: systemPrompt,
      maxRetries: 1, // Some requests fail intermittently
      ...hyperParameters,
    });

    // this.log(
    //   OpenRouterClientProvider.prototype.generateText.name,
    //   usage,
    //   providerMetadata,
    //   request,
    // );

    return {
      text,
      model,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      hyperParameters,
    };
  }

  async generateObject<TSchema extends z.ZodTypeAny>({
    prompt,
    systemPrompt,
    schema,
    model,
  }: GenerateObjectInput<TSchema>): Promise<GenerateObjectOutput<TSchema>> {
    const hyperParameters = {
      temperature: 0,
      maxOutputTokens: 10_000,
    };

    const { object, usage, providerMetadata, request } = await aiGenerateObject(
      {
        model: this.openRouter(model),
        schema,
        prompt,
        system: systemPrompt,
        maxRetries: 1, // Some requests fail intermittently
        ...hyperParameters,
      },
    );

    // this.log(
    //   OpenRouterClientProvider.prototype.generateObject.name,
    //   usage,
    //   providerMetadata,
    //   request,
    // );

    return {
      model,
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      object: object as z.infer<TSchema>,
      hyperParameters,
    };
  }

  private log(method: string, usage: any, providerMetadata: any, request: any) {
    this.logger.log(
      `[${method}] usage: ${JSON.stringify(usage, null, 2)}\nproviderMetadata: ${JSON.stringify(providerMetadata, null, 2)}\nrequest: ${JSON.stringify(request, null, 2)}`,
    );
  }
}
