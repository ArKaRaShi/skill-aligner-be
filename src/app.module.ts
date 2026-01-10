import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';

import { AppController } from './app.controller';
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
import { LoggerModule } from './shared/kernel/logger/logger.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.register(),
    ...CommonSecondaryAdapterModules,
    CourseModule,
    CampusModule,
    EmbeddingModule,
    QueryProcessorModule,
    QuestionAnalysesModule,
    EvaluatorModule,

    PipelineModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    Reflector,
  ],
})
export class AppModule {}
