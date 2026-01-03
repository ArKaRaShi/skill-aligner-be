import { z } from 'zod';

import {
  GenerateObjectInput,
  GenerateObjectOutput,
  GenerateTextInput,
  GenerateTextOutput,
} from './i-llm-provider-client.contract';

/**
 * Interface for LLM router service.
 * Routes LLM requests to appropriate providers based on model and optional provider selection.
 */
export interface ILlmRouterService {
  /**
   * Generates a raw text completion using the specified model and prompts.
   * Routes to appropriate provider based on model and optional provider parameter.
   *
   * @param params - The generation parameters including model, prompt, and system prompt
   * @param provider - Optional provider name. If not specified, uses configured default
   * @returns The generated text with token usage metadata
   * @throws Error if provider not found or model not available on provider
   */
  generateText(
    params: GenerateTextInput,
    provider?: string,
  ): Promise<GenerateTextOutput>;

  /**
   * Generates a structured object by asking the model to fill a Zod schema.
   * Routes to appropriate provider based on model and optional provider parameter.
   *
   * @param params - The generation parameters including model, prompt, system prompt, and schema
   * @param provider - Optional provider name. If not specified, uses configured default
   * @returns The generated object with token usage metadata
   * @throws Error if provider not found or model not available on provider
   */
  generateObject<TSchema extends z.ZodTypeAny>(
    params: GenerateObjectInput<TSchema>,
    provider?: string,
  ): Promise<GenerateObjectOutput<TSchema>>;
}

export const I_LLM_ROUTER_SERVICE_TOKEN = Symbol('ILlmRouterService');
