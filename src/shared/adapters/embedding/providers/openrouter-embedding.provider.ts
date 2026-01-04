import { Injectable, Logger } from '@nestjs/common';

import { OpenRouter } from '@openrouter/sdk';

import {
  EMBEDDING_DEFAULT_TIMEOUT,
  OPENROUTER_DATA_COLLECTION,
  OPENROUTER_EMBEDDING_ENCODING,
} from '../constants/embedding-config.constant';
import {
  EmbeddingModels,
  EmbeddingProviders,
} from '../constants/embedding-models.constant';
import {
  BaseEmbeddingClient,
  EmbedManyParams,
  EmbedOneParams,
  EmbedResult,
} from './base-embedding-provider.abstract';

export type OpenRouterEmbeddingProviderOptions = {
  apiKey: string;
  timeoutMs?: number;
};

@Injectable()
export class OpenRouterEmbeddingProvider extends BaseEmbeddingClient {
  private readonly timeoutMs: number;
  private readonly openRouter: OpenRouter;

  private readonly logger = new Logger(OpenRouterEmbeddingProvider.name);

  constructor(options: OpenRouterEmbeddingProviderOptions) {
    super(
      EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
      EmbeddingProviders.OPENROUTER,
      1536, // text-embedding-3-small dimension
    );
    if (!options?.apiKey) {
      throw new Error(
        'OpenRouter API key is required to use OpenRouter embeddings.',
      );
    }
    this.timeoutMs = options.timeoutMs ?? EMBEDDING_DEFAULT_TIMEOUT;
    this.openRouter = new OpenRouter({
      apiKey: options.apiKey,
    });
  }

  protected async doEmbedOne({ text }: EmbedOneParams): Promise<EmbedResult> {
    const response = await this.openRouter.embeddings.generate({
      model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
      input: text,
      encodingFormat: OPENROUTER_EMBEDDING_ENCODING,
      provider: {
        dataCollection: OPENROUTER_DATA_COLLECTION,
      },
    });

    const { promptTokens, totalTokens } = response.usage || {};

    const embedding = response.data[0].embedding as number[];
    const metadata = this.buildMetadata(text, promptTokens, totalTokens);

    return { vector: embedding, metadata };
  }

  protected async doEmbedMany({
    texts,
  }: EmbedManyParams): Promise<EmbedResult[]> {
    const response = await this.openRouter.embeddings.generate({
      model: EmbeddingModels.OPENROUTER_OPENAI_3_SMALL,
      input: texts,
      encodingFormat: OPENROUTER_EMBEDDING_ENCODING,
      provider: {
        dataCollection: OPENROUTER_DATA_COLLECTION,
      },
    });

    const { promptTokens, totalTokens } = response.usage || {};

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
      const metadata = this.buildMetadata(text, promptTokens, totalTokens);
      return {
        vector: item.embedding as number[],
        metadata,
      };
    });
  }
}
