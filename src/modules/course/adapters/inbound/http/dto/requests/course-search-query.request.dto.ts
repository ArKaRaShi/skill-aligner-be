import { ApiProperty } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Identifier } from 'src/shared/contracts/types/identifier';

import { AcademicYearSemesterFilterRequestDto } from 'src/modules/query-processor/adapters/inbound/http/dto/requests/academic-year-semester-filter.request.dto';

/**
 * Request DTO for course search by query
 * Experimental: Semantic search using natural language queries
 */
export class CourseSearchQueryRequestDto {
  @ApiProperty({
    description: 'Natural language query to search for courses',
    example: 'I want to learn about machine learning',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Minimum similarity threshold (0-1)',
    example: 0.6,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  loThreshold?: number;

  @ApiProperty({
    description: 'Maximum number of learning outcomes to retrieve',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  topNLos?: number;

  @ApiProperty({
    description: 'Filter by campus ID',
    example: 'campus-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  campusId?: Identifier;

  @ApiProperty({
    description: 'Filter by faculty ID',
    example: 'faculty-456',
    required: false,
  })
  @IsOptional()
  @IsString()
  facultyId?: Identifier;

  @ApiProperty({
    description: 'Filter by GenEd status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isGenEd?: boolean;

  @ApiProperty({
    description: 'Academic year and semester filters',
    type: [AcademicYearSemesterFilterRequestDto],
    required: false,
  })
  @IsOptional()
  @Type(() => AcademicYearSemesterFilterRequestDto)
  academicYearSemesters?: AcademicYearSemesterFilterRequestDto[];

  @ApiProperty({
    description:
      'Embedding model to use (e.g., "e5-base", "text-embedding-3-small"). Falls back to default if not specified.',
    example: 'e5-base',
    required: false,
  })
  @IsOptional()
  @IsString()
  embeddingModel?: string;
}
