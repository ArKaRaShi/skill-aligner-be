import { PrismaModule } from './prisma.module';

export * from './mappers/prisma-global.mapper';
export * from './prisma.service';

export const CommonSecondaryAdapterModules = [PrismaModule];
