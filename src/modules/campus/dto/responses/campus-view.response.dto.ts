import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';

export class CampusViewResponseDto {
  @ApiProperty({
    description: 'Campus identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Campus code',
    example: 'B',
  })
  @Expose()
  code: string;

  @ApiProperty({
    description: 'Campus name',
    example: 'วิทยาเขตบางเขน',
    nullable: true,
  })
  @Expose()
  name: string | null;
}
