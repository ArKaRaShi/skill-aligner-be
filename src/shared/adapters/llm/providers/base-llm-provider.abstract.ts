import { Logger } from '@nestjs/common';

import { z } from 'zod';

import {
  LLM_MAX_TIMEOUT_RETRIES,
  LLM_RETRY_DELAY_MS,
} from '../constants/llm-config.constant';
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
      `[${method}] usage: ${JSON.stringify(usage, null, 2)}\nproviderMetadata: ${JSON.stringify(providerMetadata, null, 2)}\nrequest: ${JSON.stringify(request, null, 2)}`,
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

  /**
   * Checks if an error is a timeout/abort error that should trigger retry.
   */
  protected isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const errorName = error.name.toLowerCase();

      return (
        errorName === 'aborterror' ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('abort')
      );
    }
    return false;
  }

  /**
   * Wraps an async operation with retry logic for timeout/abort errors only.
   * This is needed because the AI SDK's built-in maxRetries doesn't consistently
   * handle AbortError from AbortSignal.timeout().
   *
   * @param operation - The async operation to execute
   * @param context - Context for logging (method name, model, etc.)
   * @returns Promise with the operation result
   */
  protected async retryOnTimeout<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      model?: string;
    },
  ): Promise<T> {
    const maxRetries = LLM_MAX_TIMEOUT_RETRIES;
    const delayMs = LLM_RETRY_DELAY_MS;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        this.logger.log(
          `[${context.operationName}] Attempt ${attempt + 1} of ${
            maxRetries + 1
          }`,
        );
        return await operation();
      } catch (error) {
        // Only retry on timeout/abort errors
        if (this.isTimeoutError(error) && attempt < maxRetries) {
          this.logger.warn(
            `[${context.operationName}] Timeout/abort error detected (attempt ${attempt + 1}/${maxRetries + 1}). Retrying after ${delayMs}ms...`,
          );

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Don't retry on non-timeout errors or if we've exhausted retries
          throw error;
        }
      }
    }

    // Should never reach here since we either return success or throw in the loop
    throw new Error(
      `${this.providerName} failed during ${context.operationName}: Unknown error`,
    );
  }
}
