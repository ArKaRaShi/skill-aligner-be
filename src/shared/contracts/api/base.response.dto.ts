import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

/**
 * Base response DTO with common fields for all API responses.
 * Abstract class - use SuccessResponseDto or ErrorResponseDto.
 */
@ApiExtraModels()
export abstract class BaseResponseDto {
  @ApiProperty({
    example: 'Operation successful',
    description: 'Human-readable message',
  })
  message: string;

  @ApiPropertyOptional({
    example: '2025-01-11T15:30:00.000Z',
    description: 'Response timestamp (optional, can be omitted for brevity)',
  })
  timestamp?: string;
}

/**
 * Props for creating a SuccessResponseDto.
 */
type SuccessProps<T> = {
  message: string;
  data: T;
};

/**
 * Success response DTO.
 * Used for successful operations (2xx, 3xx status codes).
 *
 * @example
 * ```ts
 * return new SuccessResponseDto({
 *   message: 'Question answered successfully',
 *   data: { answer: '...', relatedCourses: [] }
 * });
 * ```
 */
@ApiExtraModels()
export class SuccessResponseDto<T> extends BaseResponseDto {
  /**
   * Creates an instance of SuccessResponseDto.
   * @param props - Properties to initialize the response DTO.
   */
  constructor(props: SuccessProps<T>) {
    super();
    this.message = props.message;
    this.data = props.data;
  }

  @ApiProperty({ description: 'Response payload data' })
  data: T;
}

/**
 * Error details object.
 */
type ErrorDetails = {
  code: number;
  statusCode?: number;
  details?: Record<string, unknown>;
};

/**
 * Props for creating an ErrorResponseDto.
 */
type ErrorProps = {
  message: string;
  error: ErrorDetails;
};

/**
 * Error response DTO.
 * Used for error responses (4xx, 5xx status codes).
 *
 * @example
 * ```ts
 * return new ErrorResponseDto({
 *   message: 'LLM request timed out',
 *   error: { code: 1001, statusCode: 504 }
 * });
 * ```
 */
@ApiExtraModels()
export class ErrorResponseDto extends BaseResponseDto {
  /**
   * Creates an instance of ErrorResponseDto.
   * @param props - Properties to initialize the response DTO.
   */
  constructor(props: ErrorProps) {
    super();
    this.message = props.message;
    this.error = props.error;
  }

  @ApiProperty({ description: 'Error details' })
  error: ErrorDetails;
}

/**
 * Union type for all API responses.
 * Use this for typing controller return values or fetch responses.
 */
export type ApiResponse<T> = SuccessResponseDto<T> | ErrorResponseDto;
