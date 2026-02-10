import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsString, Matches } from 'class-validator';

export class ClassifyQuestionRequestDto {
  @ApiPropertyOptional({
    example: 'อยากเป็น Tiktoker',
  })
  @IsString()
  @Matches(/^[\u0E00-\u0E7FA-Za-z0-9\s.,?!'""''/\-+]+$/u, {
    message:
      'question may only contain Thai or English characters, numbers, and basic punctuation',
  })
  question: string;

  @ApiPropertyOptional({
    description: 'Prompt version for question classification (optional)',
    example: 'v18',
  })
  @IsOptional()
  @IsString()
  promptVersion?: string;
}
