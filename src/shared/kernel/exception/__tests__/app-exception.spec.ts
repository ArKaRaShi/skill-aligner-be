import { HttpStatus } from '@nestjs/common';

import { AppException } from '../app-exception';
import { ErrorCode, ErrorCodeToHttpStatus } from '../exception.constant';
import type { AppErrorCode } from '../exception.constant';

describe('AppException', () => {
  describe('constructor', () => {
    it('should create exception with all required properties', () => {
      // Arrange
      const input = {
        message: 'Test error message',
        errorCode: ErrorCode.LLM_TIMEOUT,
        context: { provider: 'openai', model: 'gpt-4' },
      };

      // Act
      const exc = new AppException(input);

      // Assert
      expect(exc).toBeInstanceOf(Error);
      expect(exc.name).toBe('AppException');
      expect(exc.message).toBe('Test error message');
      expect(exc.errorCode).toBe(1001);
      expect(exc.context).toEqual({ provider: 'openai', model: 'gpt-4' });
    });

    it('should preserve original error stack trace when provided', () => {
      // Arrange
      const originalError = new Error('Original error');
      const input = {
        message: 'Wrapped error',
        errorCode: ErrorCode.UNKNOWN_ERROR,
        error: originalError,
      };

      // Act
      const exc = new AppException(input);

      // Assert
      expect(exc.stack).toBe(originalError.stack);
    });

    it('should create new stack trace when no original error', () => {
      // Arrange
      const input = {
        message: 'New error',
        errorCode: ErrorCode.LLM_TIMEOUT,
      };

      // Act
      const exc = new AppException(input);

      // Assert
      expect(exc.stack).toBeDefined();
      expect(exc.stack).toContain('New error');
    });

    it('should store original error reference', () => {
      // Arrange
      const originalError = new Error('Original');
      const input = {
        message: 'Wrapped',
        errorCode: ErrorCode.UNKNOWN_ERROR,
        error: originalError,
      };

      // Act
      const exc = new AppException(input);

      // Assert
      expect(exc.originalError).toBe(originalError);
    });
  });

  describe('getHttpStatus', () => {
    it('should return 504 GATEWAY_TIMEOUT for LLM_TIMEOUT', () => {
      // Arrange
      const exc = new AppException({
        message: 'Timeout',
        errorCode: ErrorCode.LLM_TIMEOUT,
      });

      // Act
      const status = exc.getHttpStatus();

      // Assert
      expect(status).toBe(HttpStatus.GATEWAY_TIMEOUT);
    });

    it('should return 503 SERVICE_UNAVAILABLE for LLM_RATE_LIMIT', () => {
      // Arrange
      const exc = new AppException({
        message: 'Rate limited',
        errorCode: ErrorCode.LLM_RATE_LIMIT,
      });

      // Act
      const status = exc.getHttpStatus();

      // Assert
      expect(status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should return 503 SERVICE_UNAVAILABLE for EMBEDDING_TIMEOUT', () => {
      // Arrange
      const exc = new AppException({
        message: 'Embedding timeout',
        errorCode: ErrorCode.EMBEDDING_TIMEOUT,
      });

      // Act
      const status = exc.getHttpStatus();

      // Assert
      expect(status).toBe(HttpStatus.GATEWAY_TIMEOUT);
    });

    it('should return 500 for unknown error codes', () => {
      // Arrange
      const exc = new AppException({
        message: 'Unknown',
        errorCode: 9999 as AppErrorCode,
      });

      // Act
      const status = exc.getHttpStatus();

      // Assert
      expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should return 400 for INVALID_INPUT', () => {
      // Arrange
      const exc = new AppException({
        message: 'Invalid input',
        errorCode: ErrorCode.INVALID_INPUT,
      });

      // Act
      const status = exc.getHttpStatus();

      // Assert
      expect(status).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('toJSON', () => {
    it('should serialize to plain object with all fields in development', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const exc = new AppException({
        message: 'Test error',
        errorCode: ErrorCode.LLM_TIMEOUT,
        context: { provider: 'openai' },
      });

      // Act
      const json = exc.toJSON();

      // Assert
      expect(json).toEqual({
        name: 'AppException',
        message: 'Test error',
        errorCode: 1001,
        context: { provider: 'openai' },
        stack: expect.any(String),
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should exclude stack trace in production', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const exc = new AppException({
        message: 'Test error',
        errorCode: ErrorCode.LLM_TIMEOUT,
        context: { provider: 'openai' },
      });

      // Act
      const json = exc.toJSON();

      // Assert
      expect(json).toEqual({
        name: 'AppException',
        message: 'Test error',
        errorCode: 1001,
        context: { provider: 'openai' },
      });
      expect(json).not.toHaveProperty('stack');

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should include context when present', () => {
      // Arrange
      const exc = new AppException({
        message: 'Test',
        errorCode: ErrorCode.LLM_TIMEOUT,
        context: { retryAfter: 60, requestId: 'abc-123' },
      });

      // Act
      const json = exc.toJSON();

      // Assert
      expect(json.context).toEqual({ retryAfter: 60, requestId: 'abc-123' });
    });
  });

  describe('fromUnknown', () => {
    it('should return AppException as-is without wrapping', () => {
      // Arrange
      const original = new AppException({
        message: 'Original exception',
        errorCode: ErrorCode.LLM_TIMEOUT,
        context: { timeout: 15000 },
      });

      // Act
      const result = AppException.fromUnknown(original);

      // Assert
      expect(result).toBe(original);
      expect(result.errorCode).toBe(ErrorCode.LLM_TIMEOUT);
      expect(result.context).toEqual({ timeout: 15000 });
    });

    describe('wrapping standard Error objects', () => {
      it('should detect timeout pattern and use LLM_TIMEOUT error code', () => {
        // Arrange
        const error = new Error('request timed out after 15 seconds');

        // Act
        const result = AppException.fromUnknown(error);

        // Assert
        expect(result).toBeInstanceOf(AppException);
        expect(result.errorCode).toBe(ErrorCode.LLM_TIMEOUT);
        expect(result.originalError).toBe(error);
        expect(result.message).toBe('Unexpected error occurred');
      });

      it('should detect rate limit pattern and use LLM_RATE_LIMIT error code', () => {
        // Arrange
        const error = new Error('429 rate limit exceeded');

        // Act
        const result = AppException.fromUnknown(error);

        // Assert
        expect(result.errorCode).toBe(ErrorCode.LLM_RATE_LIMIT);
      });

      it('should detect connection error pattern', () => {
        // Arrange
        const error = new Error('ECONNREFUSED connection refused');

        // Act
        const result = AppException.fromUnknown(error);

        // Assert
        expect(result.errorCode).toBe(ErrorCode.DATABASE_CONNECTION_FAILED);
      });

      it('should detect authentication error pattern', () => {
        // Arrange
        const error = new Error('401 unauthorized invalid api key');

        // Act
        const result = AppException.fromUnknown(error);

        // Assert
        expect(result.errorCode).toBe(ErrorCode.LLM_AUTH_FAILED);
      });

      it('should use fallback code when no pattern matches', () => {
        // Arrange
        const error = new Error('something completely unexpected happened');
        const fallbackCode = ErrorCode.INVALID_CONFIG;

        // Act
        const result = AppException.fromUnknown(
          error,
          'Custom fallback message',
          fallbackCode,
        );

        // Assert
        expect(result.errorCode).toBe(fallbackCode);
        expect(result.message).toBe('Custom fallback message');
      });

      it('should include provided context in wrapped exception', () => {
        // Arrange
        const error = new Error('connection failed');
        const context = { host: 'localhost', port: 5432 };

        // Act
        const result = AppException.fromUnknown(
          error,
          'Failed',
          ErrorCode.UNKNOWN_ERROR,
          context,
        );

        // Assert
        expect(result.context).toEqual(context);
      });
    });

    describe('handling non-Error types', () => {
      it('should wrap string errors', () => {
        // Arrange
        const stringError = 'string error message';

        // Act
        const result = AppException.fromUnknown(stringError);

        // Assert
        expect(result.errorCode).toBe(ErrorCode.UNKNOWN_ERROR);
        expect(result.context?.raw).toBe('string error message');
      });

      it('should wrap number errors', () => {
        // Arrange
        const numberError = 500;

        // Act
        const result = AppException.fromUnknown(numberError);

        // Assert
        expect(result.errorCode).toBe(ErrorCode.UNKNOWN_ERROR);
        expect(result.context?.raw).toBe(500);
      });

      it('should wrap object errors', () => {
        // Arrange
        const objectError = { code: 'ERR_CUSTOM', message: 'Custom error' };

        // Act
        const result = AppException.fromUnknown(objectError);

        // Assert
        expect(result.errorCode).toBe(ErrorCode.UNKNOWN_ERROR);
        expect(result.context?.raw).toEqual(objectError);
      });

      it('should wrap null errors', () => {
        // Arrange
        const nullError = null;

        // Act
        const result = AppException.fromUnknown(nullError);

        // Assert
        expect(result.errorCode).toBe(ErrorCode.UNKNOWN_ERROR);
        expect(result.context?.raw).toBe(null);
      });

      it('should use custom fallback message and code for non-Error types', () => {
        // Arrange
        const unknownValue = { custom: 'value' };

        // Act
        const result = AppException.fromUnknown(
          unknownValue,
          'Custom message',
          ErrorCode.INVALID_CONFIG,
        );

        // Assert
        expect(result.message).toBe('Custom message');
        expect(result.errorCode).toBe(ErrorCode.INVALID_CONFIG);
      });
    });
  });

  describe('error code detection patterns', () => {
    it('should detect timeout patterns: timeout, abort, timed out', () => {
      // Arrange & Act & Assert
      const patterns = [
        'Operation timed out',
        'Request timeout',
        'AbortError',
        'Connection timed out',
        'Query timed out',
      ];

      patterns.forEach((message) => {
        const error = new Error(message);
        const result = AppException.fromUnknown(error);
        expect(result.errorCode).toBe(ErrorCode.LLM_TIMEOUT);
      });
    });

    it('should detect rate limit patterns: rate limit, 429, too many requests', () => {
      // Arrange & Act & Assert
      const patterns = [
        'Rate limit exceeded',
        'rate-limit',
        '429 Too Many Requests',
        'too many requests',
      ];

      patterns.forEach((message) => {
        const error = new Error(message);
        const result = AppException.fromUnknown(error);
        expect(result.errorCode).toBe(ErrorCode.LLM_RATE_LIMIT);
      });
    });

    it('should detect authentication patterns: auth, unauthorized, 401, invalid key', () => {
      // Arrange & Act & Assert
      const patterns = [
        'Authentication failed',
        'unauthorized access',
        '401 Unauthorized',
        'invalid api key',
        'auth error',
      ];

      patterns.forEach((message) => {
        const error = new Error(message);
        const result = AppException.fromUnknown(error);
        expect(result.errorCode).toBe(ErrorCode.LLM_AUTH_FAILED);
      });
    });

    it('should detect connection patterns: connection, connect, econnrefused, econnreset', () => {
      // Arrange & Act & Assert
      const patterns = [
        'Connection failed',
        'cannot connect',
        'ECONNREFUSED',
        'ECONNRESET',
        'connection lost',
      ];

      patterns.forEach((message) => {
        const error = new Error(message);
        const result = AppException.fromUnknown(error);
        expect(result.errorCode).toBe(ErrorCode.DATABASE_CONNECTION_FAILED);
      });
    });

    it('should detect not found patterns: not found, not available, not supported', () => {
      // Arrange & Act & Assert
      const patterns = [
        'Provider not found',
        'Model not available',
        'Feature not supported',
        'Resource not found',
      ];

      patterns.forEach((message) => {
        const error = new Error(message);
        const result = AppException.fromUnknown(error);
        expect(result.errorCode).toBe(ErrorCode.LLM_MODEL_NOT_SUPPORTED);
      });
    });

    it('should detect embedding config patterns', () => {
      // Arrange & Act & Assert
      const patterns = [
        'embedding config missing',
        'has_embedding_e5 is false',
        'vector dimension 768 mismatch',
        'embedding dimension 1536 error',
      ];

      patterns.forEach((message) => {
        const error = new Error(message);
        const result = AppException.fromUnknown(error);
        expect(result.errorCode).toBe(ErrorCode.DATABASE_VALIDATION_FAILED);
      });
    });

    it('should detect validation patterns: zod, validation, schema', () => {
      // Arrange & Act & Assert
      const patterns = [
        'ZodError: validation failed',
        'schema validation error',
        'ValidationException',
        'invalid schema',
      ];

      patterns.forEach((message) => {
        const error = new Error(message);
        const result = AppException.fromUnknown(error);
        expect(result.errorCode).toBe(ErrorCode.LLM_VALIDATION_FAILED);
      });
    });
  });

  describe('ErrorCodeToHttpStatus mapping', () => {
    it('should have all error codes mapped to valid HTTP status codes', () => {
      // Arrange & Act
      const allErrorCodes = Object.values(ErrorCode);
      const validHttpStatusCodes = [
        100, 101, 102, 200, 201, 202, 203, 204, 205, 206, 207, 208, 226, 300,
        301, 302, 303, 304, 305, 306, 307, 308, 400, 401, 402, 403, 404, 405,
        406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 421,
        422, 423, 424, 425, 426, 428, 429, 431, 451, 500, 501, 502, 503, 504,
        505, 506, 507, 508, 510, 511,
      ];

      // Assert
      allErrorCodes.forEach((code) => {
        const httpStatus = ErrorCodeToHttpStatus[code];
        expect(validHttpStatusCodes).toContain(httpStatus);
        expect(httpStatus).toBeGreaterThanOrEqual(100);
        expect(httpStatus).toBeLessThan(600);
      });
    });
  });
});
