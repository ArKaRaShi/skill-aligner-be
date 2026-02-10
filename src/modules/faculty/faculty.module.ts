import { Module } from '@nestjs/common';

import { I_FACULTY_REPOSITORY_TOKEN } from './contracts/i-faculty.contract';
import { PrismaFacultyRepository } from './repositories/prisma-faculty.repository';

@Module({
  providers: [
    {
      provide: I_FACULTY_REPOSITORY_TOKEN,
      useClass: PrismaFacultyRepository,
    },
  ],
  exports: [I_FACULTY_REPOSITORY_TOKEN],
})
export class FacultyModule {}
