import { Module } from '@nestjs/common';

import { CampusController } from './campus.controller';
import { I_CAMPUS_REPOSITORY } from './contracts/i-campus-repository.contract';
import { PrismaCampusRepository } from './repositories/prisma-campus.repository';
import { CampusUseCases } from './use-cases';

@Module({
  controllers: [CampusController],
  providers: [
    ...CampusUseCases,
    { provide: I_CAMPUS_REPOSITORY, useClass: PrismaCampusRepository },
  ],
})
export class CampusModule {}
