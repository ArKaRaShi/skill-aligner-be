import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';

import {
  CampusModule,
  CourseModule,
  QueryProcessorModule,
  QuestionAnalysesModule,
} from './modules';
import { EvaluatorModule } from './modules/evaluator/evaluator.module';
import { PipelineModule } from './pipelines/pipeline.module';
import { EmbeddingModule } from './shared/adapters/embedding/embedding.module';
import { AppConfigModule } from './shared/kernel/config/app-config.module';
import { CommonSecondaryAdapterModules } from './shared/kernel/database';
import {
  AllExceptionFilter,
  AppExceptionFilter,
} from './shared/kernel/exception';
import { LoggerModule } from './shared/kernel/logger';
import { ThrottlingModule } from './shared/kernel/throttling';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.register(),
    ThrottlingModule,
    ...CommonSecondaryAdapterModules,
    CourseModule,
    CampusModule,
    EmbeddingModule,
    QueryProcessorModule,
    QuestionAnalysesModule,
    EvaluatorModule,

    PipelineModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionFilter },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    Reflector,
  ],
})
export class AppModule {}
