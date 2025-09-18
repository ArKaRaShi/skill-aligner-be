import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class UserResponseDto {
  // TODO: Use custom decorator such as IdentifierResponseProperty
  @ApiProperty({ example: '123456' })
  @Expose()
  id: string;

  // TODO: Use custom decorator such as EmailResponseProperty or StringResponseProperty
  @ApiProperty({ example: 'user@example.com' })
  @Expose()
  email: string;

  // TODO: Use custom decorator such as DateResponseProperty
  @Transform(({ value }: { value: Date }) => value?.toISOString())
  @Expose()
  createdAt: Date;

  // TODO: Use custom decorator such as DateResponseProperty
  @Transform(({ value }: { value: Date }) => value?.toISOString())
  @Expose()
  updatedAt: Date;
}
