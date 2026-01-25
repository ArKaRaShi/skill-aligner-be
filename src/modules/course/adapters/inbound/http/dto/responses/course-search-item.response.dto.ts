import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

import { CampusViewResponseDto } from 'src/modules/campus/dto/responses/campus-view.response.dto';
import { FacultyViewResponseDto } from 'src/modules/faculty/dto/responses/faculty-view.response.dto';

/**
 * Lightweight course search result item
 * Experimental: Optimized for frontend search results display
 */
export class CourseSearchItemResponseDto {
  @ApiProperty({
    description: 'Course identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Course subject code',
    example: 'CS101',
  })
  @Expose()
  subjectCode: string;

  @ApiProperty({
    description: 'Course subject name',
    example: 'Introduction to Computer Science',
  })
  @Expose()
  subjectName: string;

  @ApiProperty({
    description: 'Is this a General Education course',
    example: true,
  })
  @Expose()
  isGenEd: boolean;

  @ApiProperty({ type: CampusViewResponseDto })
  @Expose()
  campus: CampusViewResponseDto;

  @ApiProperty({ type: FacultyViewResponseDto })
  @Expose()
  faculty: FacultyViewResponseDto;

  @ApiProperty({
    description: 'Similarity score (0-100)',
    example: 85.5,
  })
  @Expose()
  score: number;

  @ApiProperty({
    description: 'Matched learning outcomes with similarity scores',
  })
  @Expose()
  matchedLearningOutcomes: Array<{
    name: string;
    similarityScore: number;
  }>;

  @ApiProperty({
    description: 'Number of matched learning outcomes',
    example: 5,
  })
  @Expose()
  matchedLoCount: number;

  @ApiProperty({
    description: 'Total number of learning outcomes',
    example: 15,
  })
  @Expose()
  totalLoCount: number;
}

/**
 * Course search response wrapper
 */
export class CourseSearchResponseDto {
  @ApiProperty({
    description: 'Array of search results',
    type: [CourseSearchItemResponseDto],
  })
  @Expose()
  results: CourseSearchItemResponseDto[];

  @ApiProperty({
    description: 'Total number of results',
    example: 42,
  })
  @Expose()
  total: number;

  @ApiProperty({
    description: 'Embedding usage metadata',
  })
  @Expose()
  embeddingUsage: {
    query: string;
    model: string;
    provider: string;
    dimension: number;
  };
}
