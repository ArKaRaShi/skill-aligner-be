import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';

import { AppController } from './app.controller';
import { CommonSecondaryAdapterModules } from './common/adapters/secondary';
import { AppConfigModule } from './config/app-config.module';
import { CourseModule, UserModule } from './modules';
import { CampusModule } from './modules/campus/campus.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';
import { QueryProcessorModule } from './modules/query-processor/query-processor.module';

@Module({
  imports: [
    AppConfigModule,
    ...CommonSecondaryAdapterModules,
    UserModule,
    CourseModule,
    CampusModule,
    EmbeddingModule.register(),
    QueryProcessorModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    Reflector,
  ],
})
export class AppModule {}
