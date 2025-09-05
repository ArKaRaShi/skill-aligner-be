import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get openRouterApiKey(): string {
    return this.configService.get('OPENROUTER_API_KEY') ?? '';
  }
}
