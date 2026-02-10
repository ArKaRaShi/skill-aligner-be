import { Logger } from '@nestjs/common';

import { APICallError } from 'ai';
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
  StreamTextInput,
  StreamTextOutput,
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
   * Streams text completion using the specified model and prompts.
   * Must be implemented by concrete provider classes.
   */
  abstract streamText({
    prompt,
    systemPrompt,
    model,
  }: StreamTextInput): StreamTextOutput;

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
   * Checks if an error is a native DOM AbortError.
   * Thrown when AbortSignal is triggered (e.g., via AbortSignal.timeout()).
   */
  protected isAbortError(error: unknown): boolean {
    if (error instanceof Error) {
      return error.name.toLowerCase() === 'aborterror';
    }
    return false;
  }

  /**
   * Checks if an error is a timeout-related error that should trigger retry.
   * This catches timeout messages that are not AbortError.
   */
  protected isTimeoutError(error: unknown): boolean {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Skip abort errors (handled by isAbortError)
      if (this.isAbortError(error)) {
        return false;
      }

      return (
        errorMessage.includes('timeout') || errorMessage.includes('timed out')
      );
    }
    return false;
  }

  /**
   * Checks if an error is a network/socket error that should trigger retry.
   * Covers connection termination, socket errors, and similar network issues.
   *
   * Uses AI SDK's APICallError.isInstance() for proper type checking.
   */
  protected isNetworkError(error: unknown): boolean {
    // Check for AI SDK APICallError with network-related cause
    if (APICallError.isInstance(error)) {
      // Check the cause for network-level errors (terminated, socket closed, etc.)
      if (error.cause instanceof Error) {
        const causeMessage = error.cause.message.toLowerCase();
        const causeCode = (error.cause as { code?: string }).code;

        return (
          causeMessage.includes('terminated') ||
          causeMessage.includes('socket') ||
          causeMessage.includes('other side closed') ||
          causeCode === 'UND_ERR_SOCKET'
        );
      }
      return false;
    }

    // Fallback: Check for direct network errors (not wrapped by AI SDK)
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const errorName = error.name.toLowerCase();

      return (
        errorMessage.includes('terminated') ||
        errorMessage.includes('socket') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('und_err_socket') ||
        errorMessage.includes('other side closed') ||
        (errorName === 'typeerror' && errorMessage.includes('terminated'))
      );
    }

    return false;
  }

  /**
   * Unified check for all retriable errors.
   * Delegates to specific error type checkers.
   */
  protected isRetriableError(error: unknown): boolean {
    return (
      this.isAbortError(error) ||
      this.isTimeoutError(error) ||
      this.isNetworkError(error)
    );
  }

  /**
   * Wraps an async operation with retry logic for retriable errors.
   * This is needed because the AI SDK's built-in maxRetries doesn't consistently
   * handle certain errors like AbortError from AbortSignal.timeout() or network
   * socket errors that occur after HTTP 200 headers are received.
   *
   * Retries on:
   * - Abort errors (via isAbortError) - Native DOM AbortError
   * - Timeout errors (via isTimeoutError) - Timeout messages
   * - Network/socket errors (via isNetworkError) - Connection issues
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
        // Only retry on retriable errors (abort, timeout, network, socket)
        if (this.isRetriableError(error) && attempt < maxRetries) {
          // Determine specific error type for logging
          const errorType = this.isAbortError(error)
            ? 'Abort'
            : this.isTimeoutError(error)
              ? 'Timeout'
              : 'Network/socket';

          this.logger.warn(
            `[${context.operationName}] ${errorType} error detected (attempt ${attempt + 1}/${maxRetries + 1}). Retrying after ${delayMs}ms...`,
          );

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // Don't retry on non-retriable errors or if we've exhausted retries
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
