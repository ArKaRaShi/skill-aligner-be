import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

import {
  QUERY_STATUS,
  type QueryStatus,
} from 'src/modules/query-logging/types/query-status.type';

/**
 * Query log list item response DTO.
 * Lightweight representation for list view with computed summaries.
 *
 * Computed fields (cost, tokens, duration) are derived from raw metrics.tokenMap
 * using TokenLogger.getSummary() for LLM vs embedding breakdown.
 */
export class QueryLogListItemResponseDto {
  @ApiProperty({
    description: 'Query log unique identifier (UUID v4)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'User question text',
    example: 'What courses teach Python programming?',
  })
  @Expose()
  question: string;

  @ApiProperty({
    description: 'Query processing status',
    enum: QUERY_STATUS,
    example: QUERY_STATUS.COMPLETED,
  })
  @Expose()
  status: QueryStatus;

  // Timestamps (ISO 8601 strings for frontend)

  @ApiProperty({
    description: 'Creation timestamp (ISO 8601)',
    example: '2025-01-15T10:30:00.000Z',
  })
  @Expose()
  createdAt: string;

  @ApiProperty({
    description: 'Query start timestamp (ISO 8601)',
    example: '2025-01-15T10:30:00.500Z',
  })
  @Expose()
  startedAt: string;

  @ApiProperty({
    description: 'Query completion timestamp (ISO 8601)',
    example: '2025-01-15T10:30:05.000Z',
    nullable: true,
  })
  @Expose()
  completedAt: string | null;

  // Duration (computed)

  @ApiProperty({
    description: 'Total query duration in seconds',
    example: 5,
    nullable: true,
  })
  @Expose()
  duration: number | null;

  // Cost breakdown (computed from tokenMap)

  @ApiProperty({
    description: 'LLM API cost in USD',
    example: 0.0234,
  })
  @Expose()
  costLlm: number;

  @ApiProperty({
    description: 'Embedding API cost in USD',
    example: 0.0012,
  })
  @Expose()
  costEmbedding: number;

  @ApiProperty({
    description: 'Total cost in USD (LLM + embedding)',
    example: 0.0246,
  })
  @Expose()
  costTotal: number;

  // Token breakdown (computed from tokenMap)

  @ApiProperty({
    description: 'Total LLM tokens (input + output)',
    example: 1250,
  })
  @Expose()
  tokensLlm: number;

  @ApiProperty({
    description: 'Total embedding tokens',
    example: 450,
  })
  @Expose()
  tokensEmbedding: number;

  @ApiProperty({
    description: 'Total tokens (LLM + embedding)',
    example: 1700,
  })
  @Expose()
  tokensTotal: number;

  // Counts (from metrics.counts or derived)

  @ApiProperty({
    description: 'Number of courses returned',
    example: 15,
  })
  @Expose()
  courseCount: number;

  @ApiProperty({
    description: 'Number of skills extracted',
    example: 3,
  })
  @Expose()
  skillCount: number;

  // Error flag

  @ApiProperty({
    description: 'Whether the query has an error',
    example: false,
  })
  @Expose()
  hasError: boolean;
}
