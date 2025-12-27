import { Module } from '@nestjs/common';

import { AppConfigService } from 'src/config/app-config.service';

import { I_LLM_PROVIDER_CLIENT_TOKEN } from './contracts/i-llm-provider-client.contract';
import {
  OPENAI_PROVIDER_TOKEN,
  OPENROUTER_PROVIDER_TOKEN,
} from './contracts/i-llm-provider-client.contract';
import { I_LLM_ROUTER_SERVICE_TOKEN } from './contracts/i-llm-router-service.contract';
import {
  I_MODEL_REGISTRY_TOKEN,
  IModelRegistry,
} from './contracts/i-model-registry.contract';
import {
  I_PROVIDER_REGISTRY_TOKEN,
  IProviderRegistry,
} from './contracts/i-provider-registry.contract';
import { OpenAIClientProvider } from './providers/openai-client.provider';
import { OpenRouterClientProvider } from './providers/openrouter-client.provider';
import { ModelRegistryService } from './registries/model-registry.service';
import { ProviderRegistryService } from './registries/provider-registry.service';
import { LlmRouterService } from './services/llm-router.service';

@Module({
  providers: [
    // OpenAI Provider
    {
      provide: OPENAI_PROVIDER_TOKEN,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        return new OpenAIClientProvider(config.openAIApiKey);
      },
    },

    // OpenRouter Provider
    {
      provide: OPENROUTER_PROVIDER_TOKEN,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        return new OpenRouterClientProvider(
          config.openRouterApiKey,
          config.openRouterBaseUrl,
        );
      },
    },

    // Provider Registry
    {
      provide: I_PROVIDER_REGISTRY_TOKEN,
      useClass: ProviderRegistryService,
    },

    // Model Registry
    {
      provide: I_MODEL_REGISTRY_TOKEN,
      useClass: ModelRegistryService,
    },

    // LLM Router Service
    {
      provide: I_LLM_ROUTER_SERVICE_TOKEN,
      inject: [
        I_PROVIDER_REGISTRY_TOKEN,
        I_MODEL_REGISTRY_TOKEN,
        OPENAI_PROVIDER_TOKEN,
        OPENROUTER_PROVIDER_TOKEN,
      ],
      useFactory: (
        providerRegistry: IProviderRegistry,
        modelRegistry: IModelRegistry,
        openaiProvider: OpenAIClientProvider,
        openrouterProvider: OpenRouterClientProvider,
      ) => {
        // Register providers
        providerRegistry.registerProvider('openai', openaiProvider);
        providerRegistry.registerProvider('openrouter', openrouterProvider);

        // Create router service
        const router = new LlmRouterService(providerRegistry, modelRegistry);

        return router;
      },
    },

    // Backward compatibility: Keep old token pointing to router service
    {
      provide: I_LLM_PROVIDER_CLIENT_TOKEN,
      useExisting: I_LLM_ROUTER_SERVICE_TOKEN,
    },
  ],
  exports: [
    I_LLM_ROUTER_SERVICE_TOKEN,
    I_LLM_PROVIDER_CLIENT_TOKEN, // Export for backward compatibility
  ],
})
export class GptLlmModule {}
