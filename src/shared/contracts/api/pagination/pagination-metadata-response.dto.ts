import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

/**
 * Pagination metadata response DTO.
 * Provides information about the current page and available pages.
 *
 * @example
 * ```json
 * {
 *   "page": 1,
 *   "pageSize": 20,
 *   "totalItems": 100,
 *   "totalPages": 5,
 *   "hasNextPage": true,
 *   "hasPreviousPage": false
 * }
 * ```
 */
export class PaginationMetadataDto {
  @ApiProperty({
    description: 'Current page number (1-indexed)',
    example: 1,
    minimum: 1,
  })
  @Expose()
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
  })
  @Expose()
  pageSize: number;

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 100,
    minimum: 0,
  })
  @Expose()
  totalItems: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
    minimum: 0,
  })
  @Expose()
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page available',
    example: true,
  })
  @Expose()
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page available',
    example: false,
  })
  @Expose()
  hasPreviousPage: boolean;
}
