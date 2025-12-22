import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

import { Identifier } from 'src/common/domain/types/identifier';

import { AcademicYearSemesterFilterRequestDto } from './academic-year-semester-filter.request.dto';

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

  @ApiPropertyOptional({
    description: 'The campus ID',
    example: 'campus-123',
  })
  @IsOptional()
  campusId?: Identifier;

  @ApiPropertyOptional({
    description: 'The faculty ID',
    example: 'faculty-456',
  })
  @IsOptional()
  facultyId?: Identifier;

  @ApiPropertyOptional({
    description: 'Whether to filter for general education courses only',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  genEdOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Filters for academic year and semesters',
    type: [AcademicYearSemesterFilterRequestDto],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcademicYearSemesterFilterRequestDto)
  academicYearSemesters?: AcademicYearSemesterFilterRequestDto[];
}
