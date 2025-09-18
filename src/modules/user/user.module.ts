import { Module } from '@nestjs/common';
import { UserApplicationModule } from './core/application/user-application.module';
import { UserHttpModule } from './adapters/primary/http/user-http.module';

@Module({
  imports: [UserApplicationModule, UserHttpModule],
  exports: [UserApplicationModule, UserHttpModule],
})
export class UserModule {}
