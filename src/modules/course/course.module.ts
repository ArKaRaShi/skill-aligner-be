import { Module } from '@nestjs/common';

import { EmbeddingModule } from '../embedding/embedding.module';
import { GptLlmModule } from '../gpt-llm/gpt-llm.module';
import { I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN } from './contracts/i-course-learning-outcome.repository';
import { I_COURSE_LEARNING_OUTCOME_SERVICE_TOKEN } from './contracts/i-course-learning-outcome.service';
import { I_COURSE_REPOSITORY_TOKEN } from './contracts/i-course.repository';
import { CourseLearningOutcomeRepository } from './repositories/course-learning-outcome.repository';
import { PrismaCourseRepository } from './repositories/prisma-course.repository';
import { CourseLearningOutcomeService } from './services/course-learning-outcome.service';
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
      useClass: CourseLearningOutcomeRepository,
    },
    {
      provide: I_COURSE_LEARNING_OUTCOME_SERVICE_TOKEN,
      useClass: CourseLearningOutcomeService,
    },
  ],
  exports: [
    I_COURSE_REPOSITORY_TOKEN,
    I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
    I_COURSE_LEARNING_OUTCOME_SERVICE_TOKEN,
  ],
})
export class CourseModule {}
