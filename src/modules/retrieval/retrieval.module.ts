import { Module } from '@nestjs/common';

import { PrismaModule } from 'src/common/adapters/secondary/prisma/prisma.module';

import { GptLabelerAdapter } from './adapters/gpt-labeler.adapter';
import { PostgresVectorAdapter } from './adapters/postgres-vector.adapter';
import { LABELER_ADAPTER } from './contracts/labeler.contract';
import { VECTOR_ADAPTER } from './contracts/vector.contract';

@Module({
  imports: [PrismaModule],
  providers: [
    { provide: VECTOR_ADAPTER, useClass: PostgresVectorAdapter },
    { provide: LABELER_ADAPTER, useClass: GptLabelerAdapter },
  ],
})
export class RetrievalModule {}
