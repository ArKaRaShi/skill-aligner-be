import { Injectable } from '@nestjs/common';

import { RegisterUserCommandDto } from './dto/command';
import { RegisterUserResultDto } from './dto/result';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';

@Injectable()
export class UserApplicationFacade {
  constructor(private readonly registerUserUseCase: RegisterUserUseCase) {}

  /**
   * Registers a new user.
   * @param command - Command containing user registration details
   * @returns - Result containing registered user information
   */
  async registerUser(
    command: RegisterUserCommandDto,
  ): Promise<RegisterUserResultDto> {
    const user = await this.registerUserUseCase.execute(command);
    return {
      id: user.id.toString(),
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
