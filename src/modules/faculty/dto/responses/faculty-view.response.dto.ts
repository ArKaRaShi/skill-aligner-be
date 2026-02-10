import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

export class FacultyViewResponseDto {
  @ApiProperty({
    description: 'Faculty identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Faculty code',
    example: 'E',
  })
  @Expose()
  code: string;

  @ApiProperty({
    description: 'Faculty name',
    example: 'คณะวิศวกรรมศาสตร์',
    nullable: true,
  })
  @Expose()
  name: string | null;
}
