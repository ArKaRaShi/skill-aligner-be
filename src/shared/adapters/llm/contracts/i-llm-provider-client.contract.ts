import { z } from 'zod';

export const I_LLM_PROVIDER_CLIENT_TOKEN = Symbol('ILlmProviderClient');
export const OPENAI_PROVIDER_TOKEN = Symbol('OpenAIProvider');
export const OPENROUTER_PROVIDER_TOKEN = Symbol('OpenRouterProvider');

export type GenerateTextInput = {
  prompt: string;
  systemPrompt: string;
  model: string;
  provider?: string; // Optional provider specification
  /** Request timeout in milliseconds (overrides default LLM_REQUEST_TIMEOUT) */
  timeout?: number;
};

export type StreamTextInput = {
  prompt: string;
  systemPrompt: string;
  model: string;
  provider?: string; // Optional provider specification
  /** Request timeout in milliseconds (overrides default LLM_REQUEST_TIMEOUT) */
  timeout?: number;
};

export type StreamTextChunk = {
  text: string;
  isFirst: boolean;
  isLast: boolean;
};

export type StreamTextOutput = {
  /** Async generator that yields text chunks as they're generated */
  stream: AsyncGenerator<StreamTextChunk>;
  /** Promise that resolves with final usage metadata when stream completes */
  usage: Promise<{
    inputTokens: number;
    outputTokens: number;
    finishReason?: string;
  }>;
};

export type GenerateObjectInput<TSchema extends z.ZodTypeAny> = {
  prompt: string;
  systemPrompt: string;
  schema: TSchema;
  model: string;
  provider?: string; // Optional provider specification
  /** Request timeout in milliseconds (overrides default LLM_REQUEST_TIMEOUT) */
  timeout?: number;
};

export type GenerateTextOutput = {
  text: string;
  model: string;
  /** Our router's selected provider: "openrouter" or "openai" */
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  finishReason?: string;
  warnings?: Array<any>;
  /** Actual backend provider used (e.g., OpenRouter→Azure, OpenAI→undefined) */
  providerMetadata?: Record<string, any>;
  response?: {
    timestamp?: Date;
    modelId?: string;
    headers?: Record<string, string>;
  };
  hyperParameters?: Record<string, any>;
};

export type GenerateObjectOutput<TSchema extends z.ZodTypeAny> = {
  model: string;
  /** Our router's selected provider: "openrouter" or "openai" */
  provider?: string;
  inputTokens: number;
  outputTokens: number;
  object: z.infer<TSchema>;
  finishReason?: string;
  warnings?: Array<any>;
  /** Actual backend provider used (e.g., OpenRouter→Azure, OpenAI→undefined) */
  providerMetadata?: Record<string, any>;
  response?: {
    timestamp?: Date;
    modelId?: string;
    headers?: Record<string, string>;
  };
  hyperParameters?: Record<string, any>;
};

export interface ILlmProviderClient {
  /**
   * Generates a raw text completion using the specified model and prompts.
   * Returns the generated text together with basic token usage metadata so callers can track costs.
   */
  generateText({
    prompt,
    systemPrompt,
    model,
    timeout,
  }: GenerateTextInput): Promise<GenerateTextOutput>;

  /**
   * Streams text completion using the specified model and prompts.
   * Returns an async generator that yields text chunks as they're generated.
   *
   * @returns StreamTextOutput with stream (async generator) and usage (promise with final metadata)
   */
  streamText({
    prompt,
    systemPrompt,
    model,
    timeout,
  }: StreamTextInput): StreamTextOutput;

  /**
   * Generates a structured object by asking the model to fill a Zod schema and returns
   * both the validated object and the token usage metadata for cost tracking.
   */
  generateObject<TSchema extends z.ZodTypeAny>({
    prompt,
    systemPrompt,
    schema,
    model,
    timeout,
  }: GenerateObjectInput<TSchema>): Promise<GenerateObjectOutput<TSchema>>;

  /**
   * Gets the provider name.
   * @returns The provider name (e.g., "OpenAI", "OpenRouter")
   */
  getProviderName(): string;
}
