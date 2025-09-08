import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfigDefault } from './app-config.constant';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get nodeEnv(): string {
    return this.configService.get('NODE_ENV') ?? AppConfigDefault.NODE_ENV;
  }

  get appDebug(): boolean {
    return this.configService.get('APP_DEBUG') ?? AppConfigDefault.APP_DEBUG;
  }

  get port(): number {
    return this.configService.get('PORT') ?? AppConfigDefault.PORT;
  }

  get databaseUrl(): string {
    return (
      this.configService.get('DATABASE_URL') ?? AppConfigDefault.DATABASE_URL
    );
  }

  get openRouterApiKey(): string {
    return (
      this.configService.get('OPENROUTER_API_KEY') ??
      AppConfigDefault.OPENROUTER_API_KEY
    );
  }
}
