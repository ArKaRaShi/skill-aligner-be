import { ApiProperty } from '@nestjs/swagger';

import { IsEmail } from 'class-validator';

export class RegisterUserRequestDto {
  // TODO: Use custom decorator such as EmailRequestProperty or StringRequestProperty
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}
