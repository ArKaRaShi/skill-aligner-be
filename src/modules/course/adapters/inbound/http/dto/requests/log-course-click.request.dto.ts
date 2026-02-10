import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * Request DTO for logging course clicks
 * courseId is passed as path parameter
 */
export class LogCourseClickRequestDto {
  @ApiProperty({
    description: 'The question log ID from the answer response',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  questionId: string;
}
