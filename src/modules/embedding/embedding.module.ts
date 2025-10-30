import { DynamicModule, Module } from '@nestjs/common';

import { AppConfigModule } from 'src/config/app-config.module';
import { AppConfigService } from 'src/config/app-config.service';

import { initSemanticsHttpClient } from 'src/common/http/semantics-http-client';

import {
  I_EMBEDDING_SERVICE_TOKEN,
  IEmbeddingService,
} from './contracts/i-embedding-service.contract';
import { E5EmbeddingService, OpenAIEmbeddingService } from './services';

@Module({})
export class EmbeddingModule {
  static register(): DynamicModule {
    return {
      module: EmbeddingModule,
      imports: [AppConfigModule],
      providers: [
        {
          provide: I_EMBEDDING_SERVICE_TOKEN,
          inject: [AppConfigService],
          useFactory: (config: AppConfigService): IEmbeddingService => {
            const provider = config.embeddingProvider;
            if (provider === 'e5') {
              const client = initSemanticsHttpClient({
                baseURL: config.semanticsApiBaseUrl,
              });
              return new E5EmbeddingService({ client });
            }
            return new OpenAIEmbeddingService({
              apiKey: config.openAIApiKey,
            });
          },
        },
      ],
      exports: [I_EMBEDDING_SERVICE_TOKEN],
    };
  }
}
