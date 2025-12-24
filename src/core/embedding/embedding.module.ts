import { DynamicModule, Module } from '@nestjs/common';

import { AppConfigModule } from 'src/config/app-config.module';
import { AppConfigService } from 'src/config/app-config.service';

import { initSemanticsHttpClient } from 'src/common/http/semantics-http-client';

import { E5EmbeddingClient, OpenRouterEmbeddingClient } from './clients';
import {
  I_EMBEDDING_CLIENT_TOKEN,
  IEmbeddingClient,
} from './contracts/i-embedding-client.contract';

@Module({})
export class EmbeddingModule {
  static register(): DynamicModule {
    return {
      module: EmbeddingModule,
      imports: [AppConfigModule],
      providers: [
        {
          provide: I_EMBEDDING_CLIENT_TOKEN,
          inject: [AppConfigService],
          useFactory: (config: AppConfigService): IEmbeddingClient => {
            const provider = config.embeddingProvider;
            if (provider === 'e5') {
              const client = initSemanticsHttpClient({
                baseURL: config.semanticsApiBaseUrl,
              });
              return new E5EmbeddingClient({ client });
            }
            if (provider === 'openrouter') {
              return new OpenRouterEmbeddingClient({
                apiKey: config.openRouterApiKey,
              });
            }
            throw new Error(`Unsupported embedding provider: ${provider}`);
          },
        },
      ],
      exports: [I_EMBEDDING_CLIENT_TOKEN],
    };
  }
}
