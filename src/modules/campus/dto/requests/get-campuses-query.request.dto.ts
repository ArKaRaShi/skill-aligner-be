import { ApiPropertyOptional } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class GetCampusesQueryRequestDto {
  @ApiPropertyOptional({
    description: 'Whether to include faculties in the campus data',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  includeFaculties?: boolean;
}
