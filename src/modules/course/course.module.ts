import { Module } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { AppConfigService } from 'src/shared/kernel/config/app-config.service';

import { EmbeddingModule } from '../../shared/adapters/embedding/embedding.module';
import { GptLlmModule } from '../../shared/adapters/llm/llm.module';
import {
  I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
  ICourseLearningOutcomeRepository,
} from './contracts/i-course-learning-outcome-repository.contract';
import {
  I_COURSE_REPOSITORY_TOKEN,
  ICourseRepository,
} from './contracts/i-course-repository.contract';
import { I_COURSE_RETRIEVER_SERVICE_TOKEN } from './contracts/i-course-retriever-service.contract';
import { PrismaCourseLearningOutcomeRepository } from './repositories/prisma-course-learning-outcome.repository';
import { PrismaCourseRepository } from './repositories/prisma-course.repository';
import { CourseRetrieverService } from './services/course-retriever.service';
import { CourseUseCases } from './use-cases';

@Module({
  imports: [GptLlmModule, EmbeddingModule],
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
      inject: [
        I_COURSE_REPOSITORY_TOKEN,
        I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
        I_LLM_ROUTER_SERVICE_TOKEN,
        AppConfigService,
      ],
      useFactory: (
        courseRepo: ICourseRepository,
        courseLoRepo: ICourseLearningOutcomeRepository,
        llmRouterService: ILlmRouterService,
        appConfigService: AppConfigService,
      ) =>
        new CourseRetrieverService(
          courseRepo,
          courseLoRepo,
          llmRouterService,
          appConfigService,
        ),
    },
  ],
  exports: [
    I_COURSE_REPOSITORY_TOKEN,
    I_COURSE_LEARNING_OUTCOME_REPOSITORY_TOKEN,
    I_COURSE_RETRIEVER_SERVICE_TOKEN,
  ],
})
export class CourseModule {}
