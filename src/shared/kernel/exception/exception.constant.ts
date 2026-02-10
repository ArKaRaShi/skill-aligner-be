import { HttpStatus } from '@nestjs/common';

export const ErrorCode = {
  // LLM Provider Errors
  LLM_TIMEOUT: 1001,
  LLM_RATE_LIMIT: 1002,
  LLM_AUTH_FAILED: 1003,
  LLM_PROVIDER_NOT_FOUND: 1004,
  LLM_MODEL_NOT_SUPPORTED: 1005,
  LLM_INVALID_RESPONSE: 1006,
  LLM_VALIDATION_FAILED: 1007,

  // Embedding Service Errors
  EMBEDDING_TIMEOUT: 2001,
  EMBEDDING_SERVICE_UNAVAILABLE: 2002,
  EMBEDDING_INVALID_MODEL: 2003,

  // Database Errors
  DATABASE_CONNECTION_FAILED: 3001,
  DATABASE_QUERY_FAILED: 3002,
  DATABASE_VALIDATION_FAILED: 3003,

  // Configuration Errors
  INVALID_CONFIG: 4001,
  MISSING_CONFIG: 4002,
  INVALID_PROMPT_VERSION: 4003,

  // Client Errors
  INVALID_INPUT: 5001,
  INVALID_MODEL_FORMAT: 5002,
  RESOURCE_NOT_FOUND: 5003,

  // General Errors
  INTERNAL_SERVER_ERROR: 9001,
  UNKNOWN_ERROR: 9999,
} as const;

export type AppErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ErrorCodeToHttpStatus: Record<AppErrorCode, number> = {
  // LLM Provider Errors
  [ErrorCode.LLM_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCode.LLM_RATE_LIMIT]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCode.LLM_AUTH_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.LLM_PROVIDER_NOT_FOUND]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCode.LLM_MODEL_NOT_SUPPORTED]: HttpStatus.BAD_REQUEST,
  [ErrorCode.LLM_INVALID_RESPONSE]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.LLM_VALIDATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Embedding Service Errors
  [ErrorCode.EMBEDDING_TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ErrorCode.EMBEDDING_SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCode.EMBEDDING_INVALID_MODEL]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Database Errors
  [ErrorCode.DATABASE_CONNECTION_FAILED]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorCode.DATABASE_QUERY_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.DATABASE_VALIDATION_FAILED]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Configuration Errors
  [ErrorCode.INVALID_CONFIG]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.MISSING_CONFIG]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.INVALID_PROMPT_VERSION]: HttpStatus.INTERNAL_SERVER_ERROR,

  // Client Errors
  [ErrorCode.INVALID_INPUT]: HttpStatus.BAD_REQUEST,
  [ErrorCode.INVALID_MODEL_FORMAT]: HttpStatus.BAD_REQUEST,
  [ErrorCode.RESOURCE_NOT_FOUND]: HttpStatus.NOT_FOUND,

  // General Errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.UNKNOWN_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
};

/**
 * Error message patterns for detecting error types from generic Error objects.
 * Used when error code is not available (legacy code throwing plain Error).
 */
export const ErrorMessagePatterns: Array<{
  pattern: RegExp;
  errorCode: AppErrorCode;
}> = [
  // LLM Timeouts
  {
    pattern: /timeout|abort|timed out/i,
    errorCode: ErrorCode.LLM_TIMEOUT,
  },
  // LLM Rate Limits
  {
    pattern: /rate.?limit|429|too many requests/i,
    errorCode: ErrorCode.LLM_RATE_LIMIT,
  },
  // Authentication
  {
    pattern: /auth|unauthorized|401|invalid.*key/i,
    errorCode: ErrorCode.LLM_AUTH_FAILED,
  },
  // Connection issues
  {
    pattern: /connection|connect|econnrefused|econnreset/i,
    errorCode: ErrorCode.DATABASE_CONNECTION_FAILED,
  },
  // Not found / not supported
  {
    pattern: /not found|not available|not supported/i,
    errorCode: ErrorCode.LLM_MODEL_NOT_SUPPORTED,
  },
  // Provider issues
  {
    pattern: /provider.*not found/i,
    errorCode: ErrorCode.LLM_PROVIDER_NOT_FOUND,
  },
  // Embedding config
  {
    pattern: /embedding.*config|has_embedding|dimension.*768|1536/i,
    errorCode: ErrorCode.DATABASE_VALIDATION_FAILED,
  },
  // Validation
  {
    pattern: /zod|validation|schema/i,
    errorCode: ErrorCode.LLM_VALIDATION_FAILED,
  },
];
