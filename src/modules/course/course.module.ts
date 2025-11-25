import { Module } from '@nestjs/common';

import { EmbeddingModule } from '../embedding/embedding.module';
import { I_COURSE_REPOSITORY_TOKEN } from './contracts/i-course.repository';
import { PrismaCourseRepository } from './repositories/prisma-course.repository';
import { CourseUseCases } from './use-cases';

@Module({
  imports: [EmbeddingModule.register()],
  providers: [
    ...CourseUseCases,
    {
      provide: I_COURSE_REPOSITORY_TOKEN,
      useClass: PrismaCourseRepository,
    },
  ],
  exports: [I_COURSE_REPOSITORY_TOKEN],
})
export class CourseModule {}
