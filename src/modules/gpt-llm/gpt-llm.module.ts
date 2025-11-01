import { Module } from '@nestjs/common';

import { AppConfigService } from 'src/config/app-config.service';

import { I_LLM_PROVIDER_CLIENT_TOKEN } from './contracts/i-llm-provider-client.contract';
import { OpenRouterClientProvider } from './providers/openrouter-client.provider';

@Module({
  providers: [
    {
      provide: I_LLM_PROVIDER_CLIENT_TOKEN,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const provider = config.gptLlmProvider;
        const model = config.gptLlmModel;
        if (provider === 'openrouter') {
          return new OpenRouterClientProvider(
            config.openRouterApiKey,
            config.openRouterBaseUrl,
            model,
          );
        }
        throw new Error(`Unsupported LLM provider: ${provider}`);
      },
    },
  ],
  exports: [I_LLM_PROVIDER_CLIENT_TOKEN],
})
export class GptLlmModule {}
