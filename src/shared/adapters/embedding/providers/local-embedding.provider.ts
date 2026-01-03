import { Injectable } from '@nestjs/common';

import type { AxiosInstance } from 'axios';

import {
  EMBEDDING_BATCH_ROLE,
  EMBEDDING_DEFAULT_ROLE,
} from '../constants/embedding-config.constant';
import {
  EmbeddingModels,
  EmbeddingProviders,
} from '../constants/embedding-models.constant';
import {
  EmbedBatchRequest,
  EmbedBatchResponse,
  EmbedRequest,
  EmbedResponse,
} from '../utils/semantics.dto';
import {
  BaseEmbeddingClient,
  EmbedManyParams,
  EmbedOneParams,
  EmbedResult,
} from './base-embedding-provider.abstract';

export type LocalEmbeddingServiceOptions = {
  client: AxiosInstance;
};

@Injectable()
export class LocalEmbeddingProvider extends BaseEmbeddingClient {
  private readonly client: AxiosInstance;

  constructor(options: LocalEmbeddingServiceOptions) {
    super(
      EmbeddingModels.E5_BASE,
      EmbeddingProviders.LOCAL,
      768, // E5-base dimension
    );

    this.client = options.client;
  }

  protected async doEmbedOne({
    text,
    role = EMBEDDING_DEFAULT_ROLE,
  }: EmbedOneParams): Promise<EmbedResult> {
    const response = await this.embed({
      text,
      role,
    });

    const metadata = {
      ...this.buildMetadata(response.adjusted_text!),
      generatedAt: response.embedded_at ?? new Date().toISOString(),
    };

    return {
      vector: response.embeddings,
      metadata,
    };
  }

  protected async doEmbedMany({
    texts,
    role = EMBEDDING_BATCH_ROLE,
  }: EmbedManyParams): Promise<EmbedResult[]> {
    const response = await this.batchEmbed({
      items: texts.map((text) => ({ text, role })),
    });

    return texts.map((text, index) => {
      const item = response.items[index];
      const generatedAt =
        item?.embedded_at ?? response.embedded_at ?? new Date().toISOString();

      return {
        vector: item?.embedding ?? [],
        metadata: {
          ...this.buildMetadata(item.adjusted_text!),
          generatedAt,
        },
      };
    });
  }

  private async embed(request: EmbedRequest): Promise<EmbedResponse> {
    return this.post<EmbedRequest, EmbedResponse>('/embed', request);
  }

  private async batchEmbed(
    request: EmbedBatchRequest,
  ): Promise<EmbedBatchResponse> {
    return this.post<EmbedBatchRequest, EmbedBatchResponse>(
      '/batch_embed',
      request,
    );
  }

  private async post<TRequest extends Record<string, unknown>, TResponse>(
    path: string,
    body: TRequest,
  ): Promise<TResponse> {
    const response = await this.client.post<TResponse>(path, body);
    return response.data;
  }
}
