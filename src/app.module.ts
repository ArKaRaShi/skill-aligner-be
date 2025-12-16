import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';

import { AppController } from './app.controller';
import { CommonSecondaryAdapterModules } from './common/adapters/secondary';
import { AppConfigModule } from './config/app-config.module';
import {
  CampusModule,
  CourseModule,
  EmbeddingModule,
  QueryProcessorModule,
} from './modules';
import { EvaluatorModule } from './modules/evaluator/evaluator.module';
import { QueryLoggingModule } from './modules/query-logging/query-logging.module';

@Module({
  imports: [
    AppConfigModule,
    ...CommonSecondaryAdapterModules,
    CourseModule,
    CampusModule,
    EmbeddingModule.register(),
    QueryProcessorModule,
    QueryLoggingModule,
    EvaluatorModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    Reflector,
  ],
})
export class AppModule {}
