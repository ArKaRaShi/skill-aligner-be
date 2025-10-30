import { Injectable } from '@nestjs/common';

import type { AxiosInstance } from 'axios';

import {
  EmbedBatchRequest,
  EmbedBatchResponse,
  EmbedRequest,
  EmbedResponse,
} from 'src/common/adapters/secondary/semantics/semantics.dto';

import { EMBEDDING_MODELS } from '../constants/model.constant';
import { IEmbeddingService } from '../contracts/i-embedding-service.contract';
import {
  BaseEmbeddingService,
  EmbeddingModelId,
  EmbedManyParams,
  EmbedOneParams,
  EmbedResult,
} from './base-embedding.service';

export type E5EmbeddingServiceOptions = {
  client: AxiosInstance;
};

const MODEL_ID: EmbeddingModelId = 'e5-base';
const PROVIDER = EMBEDDING_MODELS[MODEL_ID].provider;

@Injectable()
export class E5EmbeddingService
  extends BaseEmbeddingService
  implements IEmbeddingService
{
  private readonly client: AxiosInstance;

  constructor(options: E5EmbeddingServiceOptions) {
    super(MODEL_ID, PROVIDER);

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
      ...this.buildMetadata(MODEL_ID, response.adjusted_text!),
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
          ...this.buildMetadata(MODEL_ID, item.adjusted_text!),
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
