import { HttpStatus } from '@nestjs/common';

import {
  AppErrorCode,
  ErrorCode,
  ErrorCodeToHttpStatus,
  ErrorMessagePatterns,
} from './exception.constant';

export type AppExceptionInput = {
  message: string;
  errorCode: AppErrorCode;
  error?: Error;
  context?: Record<string, unknown>;
};

/**
 * Base exception class for all application-specific exceptions.
 *
 * Extends Error and adds:
 * - Standardized error codes (numeric)
 * - HTTP status code mapping
 * - Contextual metadata for debugging
 * - Stack trace chaining from original errors
 *
 * @example
 * ```ts
 * throw new AppException({
 *   message: 'OpenAI request timed out',
 *   errorCode: ErrorCode.LLM_TIMEOUT,
 *   error: originalError,
 *   context: { provider: 'openai', model: 'gpt-4', timeout: 15000 },
 * });
 * ```
 */
export class AppException extends Error {
  public readonly errorCode: AppErrorCode;
  public readonly originalError?: Error;
  public readonly context?: Record<string, unknown>;

  /**
   * @param input - Exception input containing message, error code, and optional context
   */
  constructor(public readonly input: AppExceptionInput) {
    super(input.message);

    this.name = 'AppException';
    this.errorCode = input.errorCode;
    this.originalError = input.error;
    this.context = input.context;

    // Preserve original stack trace if available
    if (input.error?.stack) {
      this.stack = input.error.stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppException);
    }
  }

  /**
   * Gets the HTTP status code for this exception
   */
  getHttpStatus(): number {
    return (
      ErrorCodeToHttpStatus[this.errorCode] ?? HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  /**
   * Converts the exception to a plain object for logging or response use
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      errorCode: this.errorCode,
      context: this.context,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }

  /**
   * Factory method for creating from unknown errors (fallback wrapper).
   * Useful in catch blocks when you don't know what type of error was thrown.
   *
   * @example
   * ```ts
   * try {
   *   await someOperation();
   * } catch (err) {
   *   throw AppException.fromUnknown(err, 'Operation failed', ErrorCode.UNKNOWN_ERROR);
   * }
   * ```
   */
  static fromUnknown(
    err: unknown,
    fallbackMessage = 'Unexpected error occurred',
    fallbackCode: AppErrorCode = ErrorCode.UNKNOWN_ERROR,
    context?: Record<string, unknown>,
  ): AppException {
    // If already an AppException, return as-is
    if (err instanceof AppException) {
      return err;
    }

    // If it's a standard Error, wrap it
    if (err instanceof Error) {
      // Try to detect error code from message
      const detectedCode = AppException.detectErrorCodeFromMessage(err.message);
      return new AppException({
        message: fallbackMessage,
        errorCode: detectedCode ?? fallbackCode,
        error: err,
        context,
      });
    }

    // For unknown types (string, number, etc.)
    return new AppException({
      message: fallbackMessage,
      errorCode: fallbackCode,
      context: {
        ...context,
        raw: err,
      },
    });
  }

  /**
   * Attempts to detect error code from error message using regex patterns.
   * Used by fromUnknown to convert generic Errors into typed exceptions.
   * @private
   */
  private static detectErrorCodeFromMessage(
    message: string,
  ): AppErrorCode | undefined {
    for (const { pattern, errorCode } of ErrorMessagePatterns) {
      if (pattern.test(message)) {
        return errorCode;
      }
    }
    return undefined;
  }
}
