import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

import {
  QUERY_STATUS,
  type QueryStatus,
} from 'src/modules/query-logging/types/query-status.type';

import { QueryLogStepDetailResponseDto } from './query-log-step-detail.response.dto';

// ============================================================================
// NESTED DTOs
// ============================================================================

/**
 * Query log input data response DTO.
 * Contains user filters and parameters for the query.
 */
export class QueryLogInputResponseDto {
  @ApiProperty({
    description: 'User question text',
    example: 'What courses teach Python programming?',
  })
  @Expose()
  question: string;

  @ApiProperty({
    description: 'Campus ID filter',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @Expose()
  campusId: string | null;

  @ApiProperty({
    description: 'Faculty ID filter',
    example: '987fcdeb-51a2-43f1-a456-426614174000',
    nullable: true,
  })
  @Expose()
  facultyId: string | null;

  @ApiProperty({
    description: 'GenEd course filter',
    example: false,
    nullable: true,
  })
  @Expose()
  isGenEd: boolean | null;

  @ApiProperty({
    description: 'Academic year semester filters',
    type: [Object],
    example: [
      { academicYear: 2024, semester: 1 },
      { academicYear: 2024, semester: 2 },
    ],
    nullable: true,
  })
  @Expose()
  academicYearSemesters: Array<{
    academicYear: number;
    semester: number;
  }> | null;
}

/**
 * Query log output data response DTO.
 * Contains the final result of the query processing.
 */
export class QueryLogOutputResponseDto {
  @ApiProperty({
    description: 'Generated answer text',
    example:
      'Based on your interest in Python programming, I found several courses...',
    nullable: true,
  })
  @Expose()
  answer: string | null;

  @ApiProperty({
    description: 'Suggested follow-up question',
    example: 'Would you like to see courses that also cover data science?',
    nullable: true,
  })
  @Expose()
  suggestQuestion: string | null;

  @ApiProperty({
    description: 'Related courses found',
    type: [Object],
    example: [
      { courseCode: '010123', courseName: 'Introduction to Programming' },
      { courseCode: '010456', courseName: 'Advanced Python' },
    ],
    nullable: true,
  })
  @Expose()
  relatedCourses: Array<{
    courseCode: string;
    courseName: string;
  }> | null;

  @ApiProperty({
    description: 'Classification result (for early exit queries)',
    example: {
      category: 'relevant',
      reason: 'The question is asking about courses.',
    },
    nullable: true,
  })
  @Expose()
  classification: {
    category: 'relevant' | 'irrelevant' | 'dangerous';
    reason: string;
  } | null;
}

/**
 * Query log metrics response DTO.
 * Contains raw timing records and token usage map.
 */
export class QueryLogMetricsResponseDto {
  @ApiProperty({
    description: 'Timing records per pipeline step',
    example: {
      'step1-classification': {
        start: 1705311000500,
        end: 1705311000750,
        duration: 250,
      },
      'step2-skill-expansion': {
        start: 1705311000800,
        end: 1705311001500,
        duration: 700,
      },
    },
    nullable: true,
  })
  @Expose()
  timing: Record<
    string,
    { start: number; end: number | null; duration: number | null }
  > | null;

  @ApiProperty({
    description: 'Token usage map with cost estimates per category',
    example: {
      'step1-classification': [
        {
          usage: { model: 'gpt-4o-mini', inputTokens: 150, outputTokens: 50 },
          costEstimate: { available: true, estimatedCost: 0.00015 },
        },
      ],
    },
    nullable: true,
  })
  @Expose()
  tokenMap: Record<
    string,
    Array<{
      usage: { model: string; inputTokens: number; outputTokens: number };
      costEstimate: { available: boolean; estimatedCost: number };
    }>
  > | null;

  @ApiProperty({
    description: 'Simple count statistics',
    example: {
      skillsExtracted: 3,
      coursesReturned: 15,
    },
    nullable: true,
  })
  @Expose()
  counts: {
    skillsExtracted: number | null;
    coursesReturned: number | null;
  } | null;
}

/**
 * Query log summary response DTO.
 * Computed summaries for easy consumption (derived from raw metrics).
 */
export class QueryLogSummaryResponseDto {
  @ApiProperty({
    description: 'Total query duration in seconds',
    example: 5,
    nullable: true,
  })
  @Expose()
  duration: number | null;

  @ApiProperty({
    description: 'Cost breakdown (LLM vs embedding)',
    example: {
      llm: 0.0234,
      embedding: 0.0012,
      total: 0.0246,
    },
  })
  @Expose()
  cost: {
    llm: number;
    embedding: number;
    total: number;
  };

  @ApiProperty({
    description: 'Token breakdown (LLM vs embedding)',
    example: {
      llm: { input: 800, output: 450, total: 1250 },
      embedding: { total: 450 },
      total: 1700,
    },
  })
  @Expose()
  tokens: {
    llm: {
      input: number;
      output: number;
      total: number;
    };
    embedding: {
      total: number;
    };
    total: number;
  };
}

// ============================================================================
// MAIN DETAIL RESPONSE DTO
// ============================================================================

/**
 * Query log detail response DTO.
 * Complete representation of a query log with all steps and raw data.
 *
 * This provides full transparency for debugging and analysis.
 * Computed summaries are included for convenience.
 *
 * @example
 * ```json
 * {
 *   "id": "...",
 *   "question": "What courses teach Python?",
 *   "status": "COMPLETED",
 *   "input": { "question": "...", "isGenEd": false },
 *   "output": { "answer": "...", "relatedCourses": [...] },
 *   "metrics": { "timing": {...}, "tokenMap": {...} },
 *   "summaries": { "duration": 5, "cost": {...}, "tokens": {...} },
 *   "error": null,
 *   "metadata": null,
 *   "createdAt": "2025-01-15T10:30:00.000Z",
 *   "startedAt": "2025-01-15T10:30:00.500Z",
 *   "completedAt": "2025-01-15T10:30:05.000Z",
 *   "updatedAt": "2025-01-15T10:30:05.000Z",
 *   "steps": [...]
 * }
 * ```
 */
export class QueryLogDetailResponseDto {
  // Core fields

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

  // Input/output data

  @ApiProperty({
    description: 'Query input parameters (user filters)',
    type: QueryLogInputResponseDto,
    nullable: true,
  })
  @Expose()
  input: QueryLogInputResponseDto | null;

  @ApiProperty({
    description: 'Query output data (final result)',
    type: QueryLogOutputResponseDto,
    nullable: true,
  })
  @Expose()
  output: QueryLogOutputResponseDto | null;

  // Raw metrics

  @ApiProperty({
    description: 'Raw metrics (timing, tokenMap, counts)',
    type: QueryLogMetricsResponseDto,
    nullable: true,
  })
  @Expose()
  metrics: QueryLogMetricsResponseDto | null;

  // Computed summaries

  @ApiProperty({
    description: 'Computed summaries (duration, cost, tokens)',
    type: QueryLogSummaryResponseDto,
  })
  @Expose()
  summaries: QueryLogSummaryResponseDto;

  // Error info

  @ApiProperty({
    description: 'Error information if query failed',
    example: {
      code: 'LLM_TIMEOUT',
      message: 'LLM request timed out after 30 seconds',
      stack: 'Error: LLM request timed out\n    at ...',
    },
    nullable: true,
  })
  @Expose()
  error: {
    code: string | null;
    message: string;
    stack: string | null;
  } | null;

  // Metadata (extensible)

  @ApiProperty({
    description: 'Additional metadata (sessionId, userId, etc.)',
    example: {
      sessionId: 'sess_abc123',
      userId: 'user_xyz789',
    },
    nullable: true,
  })
  @Expose()
  metadata: Record<string, unknown> | null;

  // Timestamps (ISO 8601 strings)

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

  @ApiProperty({
    description: 'Last update timestamp (ISO 8601)',
    example: '2025-01-15T10:30:05.000Z',
  })
  @Expose()
  updatedAt: string;

  // Process steps (chronological)

  @ApiProperty({
    description: 'Process steps in execution order (1-6)',
    type: [QueryLogStepDetailResponseDto],
    example: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        stepName: 'QUESTION_CLASSIFICATION',
        stepOrder: 1,
        input: { question: 'What courses teach Python?' },
        output: { category: 'relevant', reason: 'The question is relevant.' },
        llm: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          tokens: { input: 150, output: 50, total: 200 },
          cost: 0.00015,
        },
        duration: 250,
        startedAt: '2025-01-15T10:30:00.500Z',
        completedAt: '2025-01-15T10:30:00.750Z',
      },
    ],
  })
  @Expose()
  steps: QueryLogStepDetailResponseDto[];
}
