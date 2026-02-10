import { Module } from '@nestjs/common';

import { CampusController } from './campus.controller';
import { I_CAMPUS_REPOSITORY_TOKEN } from './contracts/i-campus-repository.contract';
import { PrismaCampusRepository } from './repositories/prisma-campus.repository';
import { CampusUseCases } from './use-cases';

@Module({
  controllers: [CampusController],
  providers: [
    ...CampusUseCases,
    { provide: I_CAMPUS_REPOSITORY_TOKEN, useClass: PrismaCampusRepository },
  ],
  exports: [I_CAMPUS_REPOSITORY_TOKEN],
})
export class CampusModule {}
