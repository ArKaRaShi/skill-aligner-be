import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsString, Matches } from 'class-validator';

export class ExpandSkillsRequestDto {
  @ApiPropertyOptional({
    example: 'อยากจะเรียนเกี่ยวกับการเงินเบื้องต้น ควรเริ่มต้นอย่างไร?',
  })
  @IsString()
  @Matches(/^[\u0E00-\u0E7FA-Za-z0-9\s.,?!'""''/\-+]+$/u, {
    message:
      'question may only contain Thai or English characters, numbers, and basic punctuation',
  })
  question: string;

  @ApiPropertyOptional({
    description: 'Prompt version for skill expansion (optional)',
    example: 'v9',
  })
  @IsOptional()
  @IsString()
  promptVersion?: string;
}
