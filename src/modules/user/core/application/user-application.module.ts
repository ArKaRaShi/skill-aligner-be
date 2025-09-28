import { Module } from '@nestjs/common';

import { UserPersistenceModule } from '../../adapters/secondary/persistence/user-persistence.module';
import { RegisterUserUseCase } from './use-cases/register-user.use-case';
import { UserApplicationFacade } from './user-application.facade';

@Module({
  imports: [UserPersistenceModule],
  providers: [UserApplicationFacade, RegisterUserUseCase],
  exports: [UserApplicationFacade],
})
export class UserApplicationModule {}
