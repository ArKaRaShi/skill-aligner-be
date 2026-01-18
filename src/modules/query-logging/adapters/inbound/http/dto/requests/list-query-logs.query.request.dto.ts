import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { PaginationQueryRequestDto } from 'src/shared/contracts/api/pagination/pagination-query-request.dto';

import {
  QUERY_STATUS,
  type QueryStatus,
} from 'src/modules/query-logging/types/query-status.type';

/**
 * Query parameters for listing query logs.
 * Provides filtering by status, date range, search, and pagination.
 *
 * Extends PaginationQueryRequestDto for pagination fields (page, pageSize).
 */
export class ListQueryLogsQueryRequestDto extends PaginationQueryRequestDto {
  @ApiPropertyOptional({
    description: 'Filter by query status',
    enum: QUERY_STATUS,
    example: QUERY_STATUS.COMPLETED,
  })
  @IsOptional()
  @IsEnum(QUERY_STATUS, {
    message:
      'status must be one of: PENDING, COMPLETED, EARLY_EXIT, FAILED, TIMEOUT',
  })
  status?: QueryStatus;

  @ApiPropertyOptional({
    description: 'Filter by start date (ISO 8601 format)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: 'startDate must be a valid ISO 8601 date' },
  )
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by end date (ISO 8601 format)',
    example: '2025-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsISO8601(
    { strict: true },
    { message: 'endDate must be a valid ISO 8601 date' },
  )
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Search term to filter by question text',
    example: 'python',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
