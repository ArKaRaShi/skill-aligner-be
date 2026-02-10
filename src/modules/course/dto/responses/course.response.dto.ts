import { ApiProperty } from '@nestjs/swagger';

export class CourseResponseDto {
  @ApiProperty({
    description: 'Course identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Campus identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  campusId: string;

  @ApiProperty({
    description: 'Faculty identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  facultyId: string;

  @ApiProperty({
    description: 'Academic year',
    example: 2025,
  })
  academicYear: number;

  @ApiProperty({
    description: 'Semester',
    example: 1,
  })
  semester: number;

  @ApiProperty({
    description: 'Subject code',
    example: '01355116',
  })
  subjectCode: string;

  @ApiProperty({
    description: 'Subject name in Thai',
    example: 'ภาษาอังกฤษสำหรับวิศวกร',
  })
  subjectNameTh: string;

  @ApiProperty({
    description: 'Subject name in English',
    example: 'English for Engineers',
    nullable: true,
  })
  subjectNameEn: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
