import { Controller, Get, Query } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

@Controller()
export class AppController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get('/openrouter')
  async getResponse(@Query('question') question: string): Promise<string> {
    const completions = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.appConfigService.openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b:free',
          messages: [
            {
              role: 'user',
              content: question,
            },
          ],
        }),
      },
    );

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await completions.json();
  }
}
