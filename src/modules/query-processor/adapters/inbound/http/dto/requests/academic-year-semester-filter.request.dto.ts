import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsArray, IsNumber, IsOptional } from 'class-validator';

export class AcademicYearSemesterFilterRequestDto {
  @ApiProperty({
    description: 'The academic year',
    example: 2567,
  })
  @IsNumber()
  academicYear: number;

  @ApiPropertyOptional({
    description: 'The semester numbers',
    example: [0, 1, 2],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  semesters?: number[];
}
