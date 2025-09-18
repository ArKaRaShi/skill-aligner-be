import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR, Reflector } from '@nestjs/core';

import { AppConfigModule } from './config/app-config.module';
import { AppController } from './app.controller';
import { CommonSecondaryAdapterModules } from './common/adapters/secondary';
import { UserModule } from './modules';

@Module({
  imports: [AppConfigModule, ...CommonSecondaryAdapterModules, UserModule],
  controllers: [AppController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
    Reflector,
  ],
})
export class AppModule {}
