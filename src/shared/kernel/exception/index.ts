/**
 * Exception Handling Module
 *
 * Centralized exception handling for the application.
 * Provides custom exception types and global exception filters.
 *
 * @example Usage in main.ts
 * ```ts
 * import { APP_FILTER } from '@nestjs/core';
 * import { AppExceptionFilter, AllExceptionFilter } from '@/shared/kernel/exception';
 *
 * // Register both filters
 * { provide: APP_FILTER, useClass: AppExceptionFilter },
 * { provide: APP_FILTER, useClass: AllExceptionFilter },
 * ```
 */

export { AppException } from './app-exception';
export type { AppExceptionInput } from './app-exception';

export { AppExceptionFilter } from './app-exception.filter';
export { AllExceptionFilter } from './all-exception.filter';

export {
  ErrorCode,
  ErrorCodeToHttpStatus,
  ErrorMessagePatterns,
} from './exception.constant';
export type { AppErrorCode } from './exception.constant';
