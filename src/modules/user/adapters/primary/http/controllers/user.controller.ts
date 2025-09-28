import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { BaseResponseDto } from 'src/common/adapters/primary/dto/responses/base.response.dto';

import { UserApplicationFacade } from 'src/modules/user/core/application/user-application.facade';

import { RegisterUserRequestDto } from '../dto/requests';
import { UserResponseDto } from '../dto/responses';
import { RegisterUserTransformer } from '../transformers/register-user.transformer';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userApplicationFacade: UserApplicationFacade) {}

  @Post()
  async registerUser(
    @Body() dto: RegisterUserRequestDto,
  ): Promise<BaseResponseDto<UserResponseDto>> {
    const user = await this.userApplicationFacade.registerUser(dto);
    return new BaseResponseDto({
      message: 'User registered successfully',
      data: RegisterUserTransformer.toResponseDto(user),
    });
  }
}
