import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';
import { PaginatedResponse } from 'src/shared/contracts/api/pagination';

import {
  QUERY_STATUS,
  type QueryStatus,
} from 'src/modules/query-logging/types/query-status.type';

import { QueryLogListItemResponseDto } from './query-log-list-item.response.dto';

/**
 * Filter summary response DTO.
 * Shows which filters were applied to the query.
 * All fields are explicitly nullable (not optional undefined).
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
 * Extends standard paginated response with filter summary.
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
export class QueryLogsListResponseDto extends PaginatedResponse<QueryLogListItemResponseDto> {
  @ApiProperty({
    description: 'Applied filters summary',
    type: FilterSummaryResponseDto,
  })
  @Expose()
  filters: FilterSummaryResponseDto;
}
