import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

export type ClassificationCategoryDto = 'relevant' | 'irrelevant' | 'dangerous';

export class ClassifyQuestionResponseDto {
  @ApiProperty({
    description: 'Classification category',
    enum: ['relevant', 'irrelevant', 'dangerous'],
    example: 'relevant',
  })
  @Expose()
  category: ClassificationCategoryDto;

  @ApiProperty({
    description: 'Reason for the classification',
    example:
      'Goal statement (Relax Rule) - expresses desire to be a Tiktoker, which implicitly seeks learning path for content creation skills',
  })
  @Expose()
  reason: string;

  @ApiProperty({
    description: 'LLM metadata',
    type: 'object',
    properties: {
      model: {
        type: 'string',
        description: 'Model used for classification',
        example: 'gpt-4o-mini',
      },
      provider: {
        type: 'string',
        description: 'Provider used (openrouter, openai, etc.)',
        example: 'openrouter',
        required: false,
      },
      inputTokens: {
        type: 'number',
        description: 'Number of input tokens',
        example: 123,
      },
      outputTokens: {
        type: 'number',
        description: 'Number of output tokens',
        example: 45,
      },
    },
  })
  @Expose()
  llmInfo: {
    model: string;
    provider?: string;
    inputTokens?: number;
    outputTokens?: number;
  };

  @ApiProperty({
    description: 'Token usage information',
    type: 'object',
    properties: {
      model: {
        type: 'string',
        description: 'Model used',
        example: 'gpt-4o-mini',
      },
      inputTokens: {
        type: 'number',
        description: 'Input tokens consumed',
        example: 123,
      },
      outputTokens: {
        type: 'number',
        description: 'Output tokens consumed',
        example: 45,
      },
    },
  })
  @Expose()
  tokenUsage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
  };
}
