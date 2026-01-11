import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import type { Response } from 'express';
import type { Request } from 'express';

import { ErrorResponseDto } from '../../contracts/api/base.response.dto';
import { AppConfigService } from '../config/app-config.service';
import { AppException } from './app-exception';
import { ErrorCodeToHttpStatus } from './exception.constant';

/**
 * Exception filter for AppException.
 * Catches only AppException and converts them to standardized ErrorResponseDto.
 *
 * This filter is registered BEFORE AllExceptionFilter so it catches
 * AppException first, allowing AllExceptionFilter to handle everything else.
 */
@Catch(AppException)
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  constructor(private readonly configService: AppConfigService) {}

  catch(exception: AppException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      ErrorCodeToHttpStatus[exception.errorCode] ||
      HttpStatus.INTERNAL_SERVER_ERROR;

    const isDev = this.configService.nodeEnv === 'development';

    // Log error with context
    const context = {
      errorCode: exception.errorCode,
      path: request.url,
      method: request.method,
      ...(exception.context && { errorContext: exception.context }),
    };

    this.logger.error(
      `${request.method} ${request.url} - [${exception.errorCode}] ${exception.message}`,
      isDev ? exception.stack : undefined,
      context,
    );

    // Build error details
    const errorDetails: {
      code: number;
      statusCode?: number;
      details?: Record<string, unknown>;
    } = {
      code: exception.errorCode,
    };

    // Include statusCode and details only in development
    if (isDev) {
      errorDetails.statusCode = status;
      errorDetails.details = {
        path: request.url,
        error: exception.name,
        ...(exception.context && { context: exception.context }),
        stack: exception.stack,
      };
    }

    const errorResponse = new ErrorResponseDto({
      message: exception.message,
      error: errorDetails,
    });

    return response.status(status).json(errorResponse);
  }
}
