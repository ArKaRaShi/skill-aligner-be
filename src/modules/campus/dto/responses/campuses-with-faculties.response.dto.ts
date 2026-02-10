import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

import { FacultyResponseDto } from 'src/modules/faculty/dto/responses/faculty.response.dto';

export class CampusWithFacultiesResponseDto {
  @ApiProperty({
    description: 'Campus identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  campusId: string;

  @ApiProperty({
    description: 'Campus code',
    example: 'B',
  })
  @Expose()
  campusCode: string;

  @ApiProperty({
    description: 'Campus name in English',
    example: 'Bangkhen',
    nullable: true,
  })
  @Expose()
  campusNameEn: string | null;

  @ApiProperty({
    description: 'Campus name in Thai',
    example: 'บางเขน',
    nullable: true,
  })
  @Expose()
  campusNameTh: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  @Expose()
  updatedAt: Date;

  @ApiProperty({
    description: 'List of faculties in this campus',
    type: [FacultyResponseDto],
    required: false,
  })
  @Expose()
  faculties: FacultyResponseDto[];
}
