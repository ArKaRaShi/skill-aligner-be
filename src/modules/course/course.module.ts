import { Module } from '@nestjs/common';

import { I_COURSE_REPOSITORY_TOKEN } from './contracts/i-course.repository';
import { PrismaCourseRepository } from './repositories/prisma-course.repository';

@Module({
  providers: [
    {
      provide: I_COURSE_REPOSITORY_TOKEN,
      useClass: PrismaCourseRepository,
    },
  ],
  exports: [I_COURSE_REPOSITORY_TOKEN],
})
export class CourseModule {}
