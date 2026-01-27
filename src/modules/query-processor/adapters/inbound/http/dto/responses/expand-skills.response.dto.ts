import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

export class SkillItemDto {
  @ApiProperty({ description: 'The expanded skill name' })
  @Expose()
  skill: string;

  @ApiProperty({ description: 'Reason for including this skill' })
  @Expose()
  reason: string;
}

export class LlmInfoDto {
  @ApiProperty({ description: 'Model used for expansion' })
  @Expose()
  model: string;

  @ApiProperty({
    description: 'Provider used (openrouter, openai, etc.)',
    required: false,
  })
  @Expose()
  provider?: string;

  @ApiProperty({ description: 'Number of input tokens' })
  @Expose()
  inputTokens?: number;

  @ApiProperty({ description: 'Number of output tokens' })
  @Expose()
  outputTokens?: number;
}

export class TokenUsageDto {
  @ApiProperty({ description: 'Model used' })
  @Expose()
  model: string;

  @ApiProperty({ description: 'Input tokens consumed' })
  @Expose()
  inputTokens: number;

  @ApiProperty({ description: 'Output tokens consumed' })
  @Expose()
  outputTokens: number;
}

export class ExpandSkillsResponseDto {
  @ApiProperty({
    description: 'List of expanded skills with reasons',
    type: [SkillItemDto],
  })
  @Expose()
  skillItems: SkillItemDto[];

  @ApiProperty({ description: 'LLM metadata', type: LlmInfoDto })
  @Expose()
  llmInfo: LlmInfoDto;

  @ApiProperty({ description: 'Token usage information', type: TokenUsageDto })
  @Expose()
  tokenUsage: TokenUsageDto;
}
