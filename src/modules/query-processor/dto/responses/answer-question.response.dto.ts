import { ApiProperty } from '@nestjs/swagger';

export class CourseOutputDto {
  @ApiProperty({ description: 'The name of the course' })
  courseName: string;

  @ApiProperty({ description: 'The reason for including this course' })
  reason: string;
}

export class SkillGroupedCoursesDto {
  @ApiProperty({ description: 'The skill name' })
  skill: string;

  @ApiProperty({
    description: 'List of courses related to this skill',
    type: [CourseOutputDto],
  })
  courses: CourseOutputDto[];
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
    description: 'List of skill-grouped courses',
    type: [SkillGroupedCoursesDto],
  })
  skillGroupedCourses: SkillGroupedCoursesDto[];
}
