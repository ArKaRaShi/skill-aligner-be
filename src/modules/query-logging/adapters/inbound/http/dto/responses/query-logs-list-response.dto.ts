import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';
import { PaginationMetadataDto } from 'src/shared/contracts/api/pagination/pagination-response.dto';

import {
  QUERY_STATUS,
  type QueryStatus,
} from 'src/modules/query-logging/types/query-status.type';

import { QueryLogListItemResponseDto } from './query-log-list-item.response.dto';

/**
 * Filter summary response DTO.
 * Shows which filters were applied to the query.
 */
export class FilterSummaryResponseDto {
  @ApiProperty({
    description: 'Applied status filter',
    enum: QUERY_STATUS,
    example: QUERY_STATUS.COMPLETED,
    nullable: true,
  })
  @Expose()
  status: QueryStatus | null;

  @ApiProperty({
    description: 'Applied start date filter (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
    nullable: true,
  })
  @Expose()
  startDate: string | null;

  @ApiProperty({
    description: 'Applied end date filter (ISO 8601)',
    example: '2025-01-31T23:59:59.999Z',
    nullable: true,
  })
  @Expose()
  endDate: string | null;

  @ApiProperty({
    description: 'Applied search term in question text',
    example: 'python',
    nullable: true,
  })
  @Expose()
  search: string | null;
}

/**
 * Query logs list response DTO.
 * Contains paginated list of query logs with metadata.
 *
 * @example
 * ```json
 * {
 *   "data": [
 *     { "id": "...", "question": "...", "status": "COMPLETED", ... }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "pageSize": 20,
 *     "totalItems": 100,
 *     "totalPages": 5,
 *     "hasNextPage": true,
 *     "hasPreviousPage": false
 *   },
 *   "filters": {
 *     "status": "COMPLETED",
 *     "startDate": "2025-01-01T00:00:00.000Z",
 *     "endDate": null,
 *     "search": null
 *   }
 * }
 * ```
 */
export class QueryLogsListResponseDto {
  @ApiProperty({
    description: 'Array of query log items',
    type: [QueryLogListItemResponseDto],
  })
  @Expose()
  data: QueryLogListItemResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetadataDto,
  })
  @Expose()
  pagination: PaginationMetadataDto;

  @ApiProperty({
    description: 'Applied filters summary',
    type: FilterSummaryResponseDto,
  })
  @Expose()
  filters: FilterSummaryResponseDto;
}
