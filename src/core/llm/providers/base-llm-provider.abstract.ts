import { Logger } from '@nestjs/common';

import { z } from 'zod';

import {
  GenerateObjectInput,
  GenerateObjectOutput,
  GenerateTextInput,
  GenerateTextOutput,
  ILlmProviderClient,
} from '../contracts/i-llm-provider-client.contract';

/**
 * Abstract base class for LLM provider implementations.
 * Provides common functionality and enforces consistent interface across providers.
 */
export abstract class BaseLlmProvider implements ILlmProviderClient {
  protected readonly logger: Logger;

  constructor(protected readonly providerName: string) {
    this.logger = new Logger(providerName);
  }

  /**
   * Generates a raw text completion using the specified model and prompts.
   * Must be implemented by concrete provider classes.
   */
  abstract generateText({
    prompt,
    systemPrompt,
    model,
  }: GenerateTextInput): Promise<GenerateTextOutput>;

  /**
   * Generates a structured object by asking the model to fill a Zod schema.
   * Must be implemented by concrete provider classes.
   */
  abstract generateObject<TSchema extends z.ZodTypeAny>({
    prompt,
    systemPrompt,
    schema,
    model,
  }: GenerateObjectInput<TSchema>): Promise<GenerateObjectOutput<TSchema>>;

  /**
   * Gets the provider name.
   */
  getProviderName(): string {
    return this.providerName;
  }

  /**
   * Logs a method call with usage metadata.
   */
  protected logMethodCall(
    method: string,
    usage: any,
    providerMetadata: any,
    request: any,
  ): void {
    this.logger.log(
      `[LLM Provider] [${method}] usage: ${JSON.stringify(usage, null, 2)}\nproviderMetadata: ${JSON.stringify(providerMetadata, null, 2)}\nrequest: ${JSON.stringify(request, null, 2)}`,
    );
  }

  /**
   * Validates required parameters.
   */
  protected validateGenerateTextInput({
    prompt,
    systemPrompt,
    model,
  }: GenerateTextInput): void {
    if (!prompt) {
      throw new Error('Prompt is required');
    }
    if (!systemPrompt) {
      throw new Error('System prompt is required');
    }
    if (!model) {
      throw new Error('Model is required');
    }
  }

  /**
   * Validates required parameters for object generation.
   */
  protected validateGenerateObjectInput<TSchema extends z.ZodTypeAny>({
    prompt,
    systemPrompt,
    schema,
    model,
  }: GenerateObjectInput<TSchema>): void {
    this.validateGenerateTextInput({ prompt, systemPrompt, model });
    if (!schema) {
      throw new Error('Schema is required');
    }
  }

  /**
   * Creates a standardized error message for provider failures.
   */
  protected createProviderError(
    operation: string,
    model: string,
    originalError: Error,
  ): Error {
    return new Error(
      `${this.providerName} failed to ${operation} for model '${model}': ${originalError.message}`,
    );
  }
}
