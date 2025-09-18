import { Module } from '@nestjs/common';

import { UserPersistenceModule } from '../../adapters/secondary/persistence/user-persistence.module';

import { UserApplicationFacade } from './user-application.facade';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';

@Module({
  imports: [UserPersistenceModule],
  providers: [UserApplicationFacade, RegisterUserUseCase],
  exports: [UserApplicationFacade],
})
export class UserApplicationModule {}
