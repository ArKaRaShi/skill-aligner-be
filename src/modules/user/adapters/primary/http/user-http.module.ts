import { Module } from '@nestjs/common';
import { UserApplicationModule } from 'src/modules/user/core/application/user-application.module';
import { UserController } from './controllers/user.controller';

@Module({
  controllers: [UserController],
  imports: [UserApplicationModule],
})
export class UserHttpModule {}
