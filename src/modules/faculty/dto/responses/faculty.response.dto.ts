import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

export class FacultyResponseDto {
  @ApiProperty({
    description: 'Faculty identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  facultyId: string;

  @ApiProperty({
    description: 'Faculty code',
    example: 'E',
  })
  @Expose()
  facultyCode: string;

  @ApiProperty({
    description: 'Faculty name in English',
    example: 'Faculty of Engineering',
    nullable: true,
  })
  @Expose()
  facultyNameEn: string | null;

  @ApiProperty({
    description: 'Faculty name in Thai',
    example: 'คณะวิศวกรรมศาสตร์',
    nullable: true,
  })
  @Expose()
  facultyNameTh: string | null;

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
}
