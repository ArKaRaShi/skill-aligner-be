import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

/**
 * Response DTO for course click logging
 */
export class LogCourseClickResponseDto {
  @ApiProperty({
    description: 'The course click log ID',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'The question log ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  questionId: string;

  @ApiProperty({
    description: 'The course ID that was clicked',
    example: '987fcdeb-51f2-43d1-9059-1b3d4e6f7a8b',
  })
  @Expose()
  courseId: string;

  @ApiProperty({
    description: 'When the click was recorded',
    example: '2024-01-22T10:30:00.000Z',
  })
  @Expose()
  createdAt: Date;
}
