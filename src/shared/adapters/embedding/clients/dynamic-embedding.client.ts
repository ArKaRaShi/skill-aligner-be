import { Injectable } from '@nestjs/common';

import { AppConfigService } from 'src/shared/kernel/config/app-config.service';

import { initSemanticsHttpClient } from '../../http/semantics-http-client';
import { EmbeddingMetadata } from '../constants/model.constant';
import { IEmbeddingClient } from '../contracts/i-embedding-client.contract';
import {
  BaseEmbeddingClient,
  EmbedManyParams,
  EmbedOneParams,
  EmbedResult,
} from './base-embedding.client';
import { E5EmbeddingClient } from './e5-embedding.client';
import { OpenRouterEmbeddingClient } from './openrouter-embedding.client';

export type DynamicEmbeddingClientOptions = {
  appConfigService: AppConfigService;
};

export type EmbedOneParamsWithConfig = EmbedOneParams & {
  embeddingConfiguration: EmbeddingMetadata;
};

export type EmbedManyParamsWithConfig = EmbedManyParams & {
  embeddingConfiguration: EmbeddingMetadata;
};

@Injectable()
export class DynamicEmbeddingClient extends BaseEmbeddingClient {
  private readonly appConfigService: AppConfigService;
  private readonly clients: Map<string, IEmbeddingClient> = new Map();

  constructor(options: DynamicEmbeddingClientOptions) {
    // Pass default values that will be overridden at runtime
    super('e5-base' as any, 'e5' as any);
    this.appConfigService = options.appConfigService;
    this.initializeClients();
  }

  private initializeClients(): void {
    // Initialize E5 client
    const e5Client = initSemanticsHttpClient({
      baseURL: this.appConfigService.semanticsApiBaseUrl,
    });
    this.clients.set('e5', new E5EmbeddingClient({ client: e5Client }));

    // Initialize OpenRouter client
    const openRouterClient = new OpenRouterEmbeddingClient({
      apiKey: this.appConfigService.openRouterApiKey,
    });
    this.clients.set('openrouter', openRouterClient);
  }

  private getClientForConfiguration(
    config: EmbeddingMetadata,
  ): IEmbeddingClient {
    const client = this.clients.get(config.provider);
    if (!client) {
      throw new Error(`No client found for provider: ${config.provider}`);
    }
    return client;
  }

  async embedOne(params: EmbedOneParamsWithConfig): Promise<EmbedResult> {
    const { embeddingConfiguration, ...embedParams } = params;

    const client = this.getClientForConfiguration(embeddingConfiguration);
    const result = await client.embedOne(embedParams);

    // Override metadata with the requested configuration to ensure consistency
    return {
      vector: result.vector,
      metadata: {
        ...result.metadata,
        model: embeddingConfiguration.model,
        provider: embeddingConfiguration.provider,
        dimension: embeddingConfiguration.dimension,
      },
    };
  }

  async embedMany(params: EmbedManyParamsWithConfig): Promise<EmbedResult[]> {
    const { embeddingConfiguration, ...embedParams } = params;

    const client = this.getClientForConfiguration(embeddingConfiguration);
    const results = await client.embedMany(embedParams);

    // Override metadata with the requested configuration to ensure consistency
    return results.map((result) => ({
      vector: result.vector,
      metadata: {
        ...result.metadata,
        model: embeddingConfiguration.model,
        provider: embeddingConfiguration.provider,
        dimension: embeddingConfiguration.dimension,
      },
    }));
  }

  protected doEmbedOne(_params: EmbedOneParams): Promise<EmbedResult> {
    throw new Error(
      'doEmbedOne should not be called directly on DynamicEmbeddingClient',
    );
  }

  protected doEmbedMany(_params: EmbedManyParams): Promise<EmbedResult[]> {
    throw new Error(
      'doEmbedMany should not be called directly on DynamicEmbeddingClient',
    );
  }
}
