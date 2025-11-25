import { ApiProperty } from '@nestjs/swagger';

import { IsString, Matches } from 'class-validator';

export class AnswerQuestionRequestDto {
  @ApiProperty({
    example: 'อยากจะเรียนเกี่ยวกับการเงินเบื้องต้น ควรเริ่มต้นอย่างไร?',
  })
  @IsString()
  // Allow Thai characters, English letters, numbers, spaces, and basic punctuation marks
  @Matches(/^[\u0E00-\u0E7FA-Za-z0-9\s.,?!'""''/-]+$/u, {
    message:
      'question may only contain Thai or English characters, numbers, and basic punctuation',
  })
  question: string;
}
