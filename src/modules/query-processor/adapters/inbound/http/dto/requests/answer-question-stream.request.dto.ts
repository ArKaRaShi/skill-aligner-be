import { ApiProperty } from '@nestjs/swagger';

import { IsBoolean, IsOptional } from 'class-validator';

import { AnswerQuestionRequestDto } from './answer-question.request.dto';

/**
 * Request DTO for streaming answer question endpoint.
 * Extends base request DTO with streaming mode flag.
 */
export class AnswerQuestionStreamRequestDto extends AnswerQuestionRequestDto {
  @ApiProperty({
    description: 'Whether to stream the answer text (default: true)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}
