import { Module } from '@nestjs/common';

import { I_USER_REPOSITORY_TOKEN } from 'src/modules/user/core/application/ports/inject-token.constant';

import { UserPrismaRepository } from './prisma/user-prisma.repository';

@Module({
  providers: [
    { provide: I_USER_REPOSITORY_TOKEN, useClass: UserPrismaRepository },
  ],
  exports: [
    { provide: I_USER_REPOSITORY_TOKEN, useClass: UserPrismaRepository },
  ],
})
export class UserPersistenceModule {}
