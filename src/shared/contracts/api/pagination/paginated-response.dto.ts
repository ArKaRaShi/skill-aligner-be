import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

import { PaginationMetadataDto } from './pagination-metadata-response.dto';

/**
 * Base paginated response DTO.
 * Provides standard structure for all paginated list responses.
 *
 * Extending this class ensures consistency across all paginated endpoints
 * while allowing customization through additional properties.
 *
 * @template TItem - The type of items in the data array
 *
 * @example
 * ```ts
 * export class QueryLogsListResponseDto extends PaginatedResponse<QueryLogItemDto> {
 *   @ApiPropertyOptional({ type: FilterSummaryDto })
 *   @Expose()
 *   filters?: FilterSummaryDto;
 * }
 * ```
 */
export class PaginatedResponse<TItem> {
  @ApiProperty({
    description: 'Array of items for the current page',
    isArray: true,
  })
  @Expose()
  data: TItem[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetadataDto,
  })
  @Expose()
  pagination: PaginationMetadataDto;
}
