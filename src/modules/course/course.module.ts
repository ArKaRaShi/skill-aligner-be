import { Module } from '@nestjs/common';

import { EmbeddingModule } from '../embedding/embedding.module';
import { GptLlmModule } from '../gpt-llm/gpt-llm.module';
import { I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN } from './contracts/i-course-learning-outcome-repository.contract';
import { I_COURSE_REPOSITORY_TOKEN } from './contracts/i-course-repository.contract';
import { I_COURSE_RETRIEVER_SERVICE_TOKEN } from './contracts/i-course-retriever-service.contract';
import { PrismaCourseLearningOutcomeRepository } from './repositories/prisma-course-learning-outcome.repository';
import { PrismaCourseRepository } from './repositories/prisma-course.repository';
import { CourseRetrieverService } from './services/course-retriever.service';
import { CourseUseCases } from './use-cases';

@Module({
  imports: [GptLlmModule, EmbeddingModule.register()],
  providers: [
    ...CourseUseCases,
    {
      provide: I_COURSE_REPOSITORY_TOKEN,
      useClass: PrismaCourseRepository,
    },
    {
      provide: I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
      useClass: PrismaCourseLearningOutcomeRepository,
    },
    {
      provide: I_COURSE_RETRIEVER_SERVICE_TOKEN,
      useClass: CourseRetrieverService,
    },
  ],
  exports: [
    I_COURSE_REPOSITORY_TOKEN,
    I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
    I_COURSE_RETRIEVER_SERVICE_TOKEN,
  ],
})
export class CourseModule {}
