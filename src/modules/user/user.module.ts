import { Module } from '@nestjs/common';

import { UserHttpModule } from './adapters/primary/http/user-http.module';
import { UserApplicationModule } from './core/application/user-application.module';

@Module({
  imports: [UserApplicationModule, UserHttpModule],
  exports: [UserApplicationModule, UserHttpModule],
})
export class UserModule {}
