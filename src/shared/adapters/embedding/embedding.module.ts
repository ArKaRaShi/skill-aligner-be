import { Module } from '@nestjs/common';

import {
  I_MODEL_REGISTRY_TOKEN,
  IModelRegistry,
} from '../../adapters/llm/contracts/i-model-registry.contract';
import { AppConfigService } from '../../kernel/config/app-config.service';
import {
  IEmbeddingClient,
  LOCAL_PROVIDER_TOKEN,
  OPENROUTER_PROVIDER_TOKEN,
} from './contracts/i-embedding-client.contract';
import {
  I_EMBEDDING_PROVIDER_REGISTRY_TOKEN,
  IEmbeddingProviderRegistry,
} from './contracts/i-embedding-provider-registry.contract';
import { I_EMBEDDING_ROUTER_SERVICE_TOKEN } from './contracts/i-embedding-router-service.contract';
import { LocalEmbeddingProvider } from './providers/local-embedding.provider';
import { OpenRouterEmbeddingProvider } from './providers/openrouter-embedding.provider';
import { EmbeddingModelRegistryService } from './registries/embedding-model-registry.service';
import { EmbeddingProviderRegistry } from './registries/embedding-provider-registry.service';
import { EmbeddingRouterService } from './services/embedding-router.service';
import { initSemanticsHttpClient } from './utils/semantics-http-client';

@Module({
  providers: [
    // Local Provider
    {
      provide: LOCAL_PROVIDER_TOKEN,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const client = initSemanticsHttpClient({
          baseURL: config.semanticsApiBaseUrl,
          timeout: 15_000,
        });
        return new LocalEmbeddingProvider({ client });
      },
    },

    // OpenRouter Provider
    {
      provide: OPENROUTER_PROVIDER_TOKEN,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        return new OpenRouterEmbeddingProvider({
          apiKey: config.openRouterApiKey,
        });
      },
    },

    // Model Registry
    {
      provide: I_MODEL_REGISTRY_TOKEN,
      useClass: EmbeddingModelRegistryService,
    },

    // Provider Registry
    {
      provide: I_EMBEDDING_PROVIDER_REGISTRY_TOKEN,
      useClass: EmbeddingProviderRegistry,
    },

    // Embedding Router Service
    {
      provide: I_EMBEDDING_ROUTER_SERVICE_TOKEN,
      inject: [
        I_EMBEDDING_PROVIDER_REGISTRY_TOKEN,
        I_MODEL_REGISTRY_TOKEN,
        LOCAL_PROVIDER_TOKEN,
        OPENROUTER_PROVIDER_TOKEN,
      ],
      useFactory: (
        providerRegistry: IEmbeddingProviderRegistry,
        modelRegistry: IModelRegistry,
        localProvider: IEmbeddingClient,
        openrouterProvider: IEmbeddingClient,
      ) => {
        // Register providers
        providerRegistry.registerProvider('local', localProvider);
        providerRegistry.registerProvider('openrouter', openrouterProvider);

        // Create router service with injected dependencies
        const router = new EmbeddingRouterService(
          providerRegistry,
          modelRegistry,
        );

        return router;
      },
    },
  ],
  exports: [I_EMBEDDING_ROUTER_SERVICE_TOKEN],
})
export class EmbeddingModule {}
