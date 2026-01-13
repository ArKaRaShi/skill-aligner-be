import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

import type { Response } from 'express';
import type { Request } from 'express';

import { ErrorResponseDto } from '../../contracts/api/base.response.dto';
import { AppConfigService } from '../config/app-config.service';

/**
 * Global exception filter that catches all non-AppException errors.
 * Extends NestJS BaseExceptionFilter to handle HttpException properly.
 *
 * This filter catches:
 * - HttpException (NestJS built-in exceptions)
 * - Unknown errors (fallback to 500)
 *
 * AppException is handled by AppExceptionFilter.
 */
@Catch()
export class AllExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name);

  constructor(private readonly configService: AppConfigService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Handle non-HTTP exceptions
    if (!(exception instanceof HttpException)) {
      this.handleNonHttpException(exception, response, request);
      return;
    }

    // Let NestJS handle HTTP exceptions (validation errors, etc.)
    super.catch(exception, host);
  }

  private handleNonHttpException(
    exception: unknown,
    response: Response,
    request: Request,
  ) {
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = 'Internal Server Error';

    // Log the error with full context
    this.logger.error(
      `${request.method} ${request.url} - ${message}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const isDev = this.configService.nodeEnv === 'development';

    // Build error details
    const errorDetails: {
      code: number;
      statusCode?: number;
      details?: Record<string, unknown>;
    } = {
      code: 9999, // UNKNOWN_ERROR
    };

    // Include statusCode and details only in development
    if (isDev) {
      errorDetails.statusCode = status;
      errorDetails.details = {
        path: request.url,
        error: exception instanceof Error ? exception.name : 'UnknownError',
        details:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      };
    }

    const errorResponse = new ErrorResponseDto({
      message,
      error: errorDetails,
    });

    return response.status(status).json(errorResponse);
  }
}
