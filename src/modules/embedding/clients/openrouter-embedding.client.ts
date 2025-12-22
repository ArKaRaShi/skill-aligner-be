import { Injectable, Logger } from '@nestjs/common';

import { OpenRouter } from '@openrouter/sdk';

import {
  EmbeddingModels,
  EmbeddingProviders,
} from '../constants/model.constant';
import { IEmbeddingClient } from '../contracts/i-embedding-client.contract';
import {
  BaseEmbeddingClient,
  EmbedManyParams,
  EmbedOneParams,
  EmbedResult,
} from './base-embedding.client';

export type OpenRouterEmbeddingClientOptions = {
  apiKey: string;
  timeoutMs?: number;
};

@Injectable()
export class OpenRouterEmbeddingClient
  extends BaseEmbeddingClient
  implements IEmbeddingClient
{
  private readonly timeoutMs: number;
  private readonly openRouter: OpenRouter;

  private readonly logger = new Logger(OpenRouterEmbeddingClient.name);

  constructor(options: OpenRouterEmbeddingClientOptions) {
    super(
      EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
      EmbeddingProviders.OPENROUTER,
    );
    if (!options?.apiKey) {
      throw new Error(
        'OpenRouter API key is required to use OpenRouter embeddings.',
      );
    }
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.openRouter = new OpenRouter({
      apiKey: options.apiKey,
    });
  }

  protected async doEmbedOne({ text }: EmbedOneParams): Promise<EmbedResult> {
    const response = await this.openRouter.embeddings.generate({
      model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
      input: text,
      encodingFormat: 'float',
      provider: {
        dataCollection: 'deny',
      },
    });

    const embedding = response.data[0].embedding as number[];
    const metadata = this.buildMetadata(text);

    return { vector: embedding, metadata };
  }

  protected async doEmbedMany({
    texts,
  }: EmbedManyParams): Promise<EmbedResult[]> {
    const response = await this.openRouter.embeddings.generate({
      model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
      input: texts,
      encodingFormat: 'float',
      provider: {
        dataCollection: 'deny',
      },
    });

    return response.data.map((item) => {
      const { index } = item;

      // Avoid issue on wrong vector mapping
      if (index === undefined) {
        this.logger.warn(
          'Received embedding item without index from OpenRouter.',
        );
        throw new Error('Invalid embedding response from OpenRouter.');
      }

      const text = texts[index];
      const metadata = this.buildMetadata(text);
      return {
        vector: item.embedding as number[],
        metadata,
      };
    });
  }
}
