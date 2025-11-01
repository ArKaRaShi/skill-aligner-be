import { ApiProperty } from '@nestjs/swagger';

export class RelatedCourseDto {
  @ApiProperty({ description: 'The skill related to the course' })
  skill: string;

  @ApiProperty({ description: 'The name of the related course' })
  courseName: string;
}

export class AnswerQuestionResponseDto {
  @ApiProperty({ description: 'The answer to the question', nullable: true })
  answer: string | null;

  @ApiProperty({
    description:
      'A suggested question if the original was out of scope or unsafe',
    nullable: true,
  })
  suggestQuestion: string | null;

  @ApiProperty({
    description: 'List of related courses',
    type: [RelatedCourseDto],
  })
  relatedCourses: RelatedCourseDto[];
}
