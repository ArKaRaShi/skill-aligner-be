import { Inject, Injectable } from '@nestjs/common';

import { IUseCase } from 'src/common/application/contracts/i-use-case.contract';

import { User } from '../../domain/entities/user.entity';
import { RegisterUserCommandDto } from '../dto/command';
import type { IUserRepository } from '../ports/i-user.repository';
import { I_USER_REPOSITORY_TOKEN } from '../ports/inject-token.constant';

@Injectable()
export class RegisterUserUseCase
  implements IUseCase<RegisterUserCommandDto, User>
{
  constructor(
    @Inject(I_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(command: RegisterUserCommandDto): Promise<User> {
    const { email } = command;

    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      // TODO: Use AppException
      throw new Error('Email already in use');
    }

    // Create and save the new user
    const user = User.create({ email });
    return this.userRepository.save(user);
  }
}
