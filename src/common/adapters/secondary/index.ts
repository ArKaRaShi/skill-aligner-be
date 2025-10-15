import { PrismaModule } from 'src/common/adapters/secondary/prisma/prisma.module';

export * from './semantics/semantics.client';
export * from './semantics/semantics.dto';

export const CommonSecondaryAdapterModules = [PrismaModule];
