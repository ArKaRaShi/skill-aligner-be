import { Injectable } from '@nestjs/common';

import { openai } from '@ai-sdk/openai';
import { embed, embedMany } from 'ai';

import { EMBEDDING_MODELS } from '../constants/model.constant';
import { IEmbeddingClient } from '../contracts/i-embedding-client.contract';
import {
  BaseEmbeddingClient,
  EmbeddingModelId,
  EmbedManyParams,
  EmbedOneParams,
  EmbedResult,
} from './base-embedding.client';

const MODEL_ID: EmbeddingModelId = 'text-embedding-3-small';

export type OpenAIEmbeddingClientOptions = {
  apiKey: string;
  timeoutMs?: number;
};

@Injectable()
export class OpenAIEmbeddingClient
  extends BaseEmbeddingClient
  implements IEmbeddingClient
{
  private readonly timeoutMs: number;

  constructor(options: OpenAIEmbeddingClientOptions) {
    super(MODEL_ID, EMBEDDING_MODELS[MODEL_ID].provider);
    if (!options?.apiKey) {
      throw new Error('OpenAI API key is required to use OpenAI embeddings.');
    }
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  protected async doEmbedOne({ text }: EmbedOneParams): Promise<EmbedResult> {
    const { embedding } = await embed({
      model: openai.textEmbeddingModel(MODEL_ID),
      value: text,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(this.timeoutMs),
    });

    const metadata = this.buildMetadata(MODEL_ID, text);

    return { vector: embedding, metadata };
  }

  protected async doEmbedMany({
    texts,
  }: EmbedManyParams): Promise<EmbedResult[]> {
    const { embeddings } = await embedMany({
      maxParallelCalls: 2, // Limit parallel requests
      model: openai.textEmbeddingModel(MODEL_ID),
      values: texts,
      abortSignal: AbortSignal.timeout(this.timeoutMs),
    });

    return texts.map((text, index) => ({
      vector: embeddings[index],
      metadata: this.buildMetadata(MODEL_ID, text),
    }));
  }
}
