import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

import { CampusViewResponseDto } from 'src/modules/campus/dto/responses/campus-view.response.dto';
import { FacultyViewResponseDto } from 'src/modules/faculty/dto/responses/faculty-view.response.dto';

export class LearningOutcomeDto {
  @ApiProperty({ description: 'The ID of the learning outcome' })
  @Expose()
  loId: string;

  @ApiProperty({ description: 'The original name of the learning outcome' })
  @Expose()
  originalName: string;

  @ApiProperty({ description: 'The cleaned name of the learning outcome' })
  @Expose()
  cleanedName: string;
}

export class CourseOfferingDto {
  @ApiProperty({ description: 'The ID of the course offering' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'The ID of the course' })
  @Expose()
  courseId: string;

  @ApiProperty({ description: 'The semester number' })
  @Expose()
  semester: number;

  @ApiProperty({ description: 'The academic year' })
  @Expose()
  academicYear: number;

  @ApiProperty({ description: 'When this course offering was created' })
  @Expose()
  createdAt: Date;
}

export class MatchedSkillLearningOutcomesDto {
  @ApiProperty({ description: 'The skill name' })
  @Expose()
  skill: string;

  @ApiProperty({
    description: 'List of matched learning outcomes for this skill',
    type: [LearningOutcomeDto],
  })
  @Expose()
  learningOutcomes: LearningOutcomeDto[];
}

export class CourseOutputDto {
  @ApiProperty({ description: 'The ID of the course' })
  @Expose()
  id: string;

  @ApiProperty({ description: 'The campus information' })
  @Expose()
  campus: CampusViewResponseDto;

  @ApiProperty({ description: 'The faculty information' })
  @Expose()
  faculty: FacultyViewResponseDto;

  @ApiProperty({ description: 'The subject code of the course' })
  @Expose()
  subjectCode: string;

  @ApiProperty({ description: 'The subject name of the course' })
  @Expose()
  subjectName: string;

  @ApiProperty({ description: 'Whether this is a general education course' })
  @Expose()
  isGenEd: boolean;

  @ApiProperty({
    description: 'List of course learning outcomes',
    type: [LearningOutcomeDto],
  })
  @Expose()
  courseLearningOutcomes: LearningOutcomeDto[];

  @ApiProperty({
    description: 'List of matched skills with their learning outcomes',
    type: [MatchedSkillLearningOutcomesDto],
  })
  @Expose()
  matchedSkills: MatchedSkillLearningOutcomesDto[];

  @ApiProperty({
    description: 'List of course offerings',
    type: [CourseOfferingDto],
  })
  @Expose()
  courseOfferings: CourseOfferingDto[];

  @ApiProperty({ description: 'Relevance score of the course' })
  @Expose()
  score: number;

  @ApiProperty({ description: 'Total number of clicks for this course' })
  @Expose()
  totalClicks: number;
}

export class AnswerQuestionResponseDto {
  @ApiProperty({ description: 'The answer to the question', nullable: true })
  @Expose()
  answer: string | null;

  @ApiProperty({
    description:
      'A suggested question if the original was out of scope or unsafe',
    nullable: true,
  })
  @Expose()
  suggestQuestion: string | null;

  @ApiProperty({
    description: 'List of related courses',
    type: [CourseOutputDto],
  })
  @Expose()
  relatedCourses: CourseOutputDto[];
}
