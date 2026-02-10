import { ApiPropertyOptional } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * Base pagination query request DTO.
 * Provides common pagination fields for query parameters.
 *
 * Extend this class for paginated list endpoints:
 * @example
 * ```ts
 * export class ListItemsQueryRequestDto extends PaginationQueryRequestDto {
 *   // Add filter-specific fields here
 * }
 * ```
 */
export class PaginationQueryRequestDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'page must be a number' })
  @Min(1, { message: 'page must be at least 1' })
  @Transform(({ value }) => Number(value))
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber({}, { message: 'pageSize must be a number' })
  @Min(1, { message: 'pageSize must be at least 1' })
  @Max(100, { message: 'pageSize cannot exceed 100' })
  @Transform(({ value }) => Number(value))
  pageSize?: number;
}
