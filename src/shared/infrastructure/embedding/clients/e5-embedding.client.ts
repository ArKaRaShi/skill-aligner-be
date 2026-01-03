import { Injectable } from '@nestjs/common';

import type { AxiosInstance } from 'axios';

import {
  EmbedBatchRequest,
  EmbedBatchResponse,
  EmbedRequest,
  EmbedResponse,
} from '../../http/semantics.dto';
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

export type E5EmbeddingServiceOptions = {
  client: AxiosInstance;
};

@Injectable()
export class E5EmbeddingClient
  extends BaseEmbeddingClient
  implements IEmbeddingClient
{
  private readonly client: AxiosInstance;

  constructor(options: E5EmbeddingServiceOptions) {
    super(EmbeddingModels.E5_BASE, EmbeddingProviders.E5);

    this.client = options.client;
  }

  protected async doEmbedOne({
    text,
    role = 'query',
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
    role = 'passage',
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
