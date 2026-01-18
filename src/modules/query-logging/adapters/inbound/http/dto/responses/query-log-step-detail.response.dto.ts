import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

import {
  STEP_NAME,
  type StepName,
} from 'src/modules/query-logging/types/query-status.type';

/**
 * LLM information response DTO for a process step.
 * Contains provider, model, token usage, and cost data.
 */
export class StepLlmInfoResponseDto {
  @ApiProperty({
    description: 'LLM provider name',
    example: 'openai',
    nullable: true,
  })
  @Expose()
  provider: string | null;

  @ApiProperty({
    description: 'LLM model name',
    example: 'gpt-4o-mini',
    nullable: true,
  })
  @Expose()
  model: string | null;

  @ApiProperty({
    description: 'Token usage breakdown',
    example: { input: 500, output: 250, total: 750 },
    nullable: true,
  })
  @Expose()
  tokens: {
    input: number;
    output: number;
    total: number;
  } | null;

  @ApiProperty({
    description: 'Estimated cost in USD',
    example: 0.0015,
    nullable: true,
  })
  @Expose()
  cost: number | null;
}

/**
 * Embedding information response DTO for a process step.
 * Contains model, provider, dimension, and token usage.
 */
export class StepEmbeddingInfoResponseDto {
  @ApiProperty({
    description: 'Embedding model name',
    example: 'text-embedding-3-small',
    nullable: true,
  })
  @Expose()
  model: string | null;

  @ApiProperty({
    description: 'Embedding provider name',
    example: 'openai',
    nullable: true,
  })
  @Expose()
  provider: string | null;

  @ApiProperty({
    description: 'Embedding vector dimension',
    example: 1536,
    nullable: true,
  })
  @Expose()
  dimension: number | null;

  @ApiProperty({
    description: 'Total embedding tokens used',
    example: 450,
    nullable: true,
  })
  @Expose()
  totalTokens: number | null;
}

/**
 * Query process step detail response DTO.
 * Full representation of a single pipeline step with all data.
 *
 * This includes raw input/output, LLM/embedding configs, metrics, and errors.
 * Useful for debugging and analyzing pipeline execution.
 */
export class QueryLogStepDetailResponseDto {
  // Core fields

  @ApiProperty({
    description: 'Step unique identifier (UUID v4)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Step name in the pipeline',
    enum: STEP_NAME,
    example: STEP_NAME.QUESTION_CLASSIFICATION,
  })
  @Expose()
  stepName: StepName;

  @ApiProperty({
    description: 'Step execution order (1-6)',
    example: 1,
    minimum: 1,
    maximum: 6,
  })
  @Expose()
  stepOrder: number;

  // Data fields

  @ApiProperty({
    description: 'Raw input data for this step',
    example: { question: 'What courses teach Python?' },
    nullable: true,
  })
  @Expose()
  input: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Raw output data from this step (ServiceRawOutput union)',
    example: {
      category: 'relevant',
      reason: 'The question is asking about courses, which is relevant.',
    },
    nullable: true,
  })
  @Expose()
  output: Record<string, unknown> | null;

  @ApiProperty({
    description: 'LLM configuration and usage for this step',
    type: StepLlmInfoResponseDto,
    nullable: true,
  })
  @Expose()
  llm: StepLlmInfoResponseDto | null;

  @ApiProperty({
    description:
      'Embedding configuration and usage (for COURSE_RETRIEVAL step)',
    type: StepEmbeddingInfoResponseDto,
    nullable: true,
  })
  @Expose()
  embedding: StepEmbeddingInfoResponseDto | null;

  @ApiProperty({
    description: 'Step metrics (duration, etc.)',
    example: { duration: 250 },
    nullable: true,
  })
  @Expose()
  metrics: {
    duration: number;
  } | null;

  @ApiProperty({
    description: 'Error information if step failed',
    example: {
      code: 'LLM_TIMEOUT',
      message: 'LLM request timed out',
      details: { timeout: 30000 },
    },
    nullable: true,
  })
  @Expose()
  error: {
    code: string | null;
    message: string;
    details: unknown;
  } | null;

  // Timestamps (ISO 8601 strings)

  @ApiProperty({
    description: 'Step start timestamp (ISO 8601)',
    example: '2025-01-15T10:30:01.000Z',
  })
  @Expose()
  startedAt: string;

  @ApiProperty({
    description: 'Step completion timestamp (ISO 8601)',
    example: '2025-01-15T10:30:01.250Z',
    nullable: true,
  })
  @Expose()
  completedAt: string | null;

  @ApiProperty({
    description: 'Step duration in milliseconds',
    example: 250,
    nullable: true,
  })
  @Expose()
  duration: number | null;
}
