import { Injectable } from '@nestjs/common';

import { EMBEDDING_MODELS } from '../constants/model.constant';
import { IEmbeddingClient } from '../contracts/i-embedding-client.contract';

export type EmbeddingProviderKey = 'e5' | 'openai' | 'openrouter';

export const EMBEDDING_PROVIDERS: EmbeddingProviderKey[] = [
  'e5',
  'openai',
  'openrouter',
] as const;

export type EmbeddingModelId = keyof typeof EMBEDDING_MODELS;

export type EmbedOneParams = {
  text: string;
  role?: 'query' | 'passage';
};

export type EmbedManyParams = {
  texts: string[];
  role?: 'query' | 'passage';
};

export type EmbeddingModelMetadata =
  (typeof EMBEDDING_MODELS)[EmbeddingModelId];

export type EmbeddingResultMetadata = EmbeddingModelMetadata & {
  embeddedText: string; // The text that was embedded
  generatedAt: string;
};

export type EmbedResult = {
  vector: number[];
  metadata: EmbeddingResultMetadata;
};

@Injectable()
export abstract class BaseEmbeddingClient implements IEmbeddingClient {
  constructor(
    private readonly model: EmbeddingModelId,
    private readonly provider: EmbeddingProviderKey,
  ) {
    this.ensureModel(this.model);
    this.ensureProvider(this.provider);
  }

  private ensureProvider(provider: EmbeddingProviderKey): void {
    if (!EMBEDDING_PROVIDERS.includes(provider)) {
      throw new Error(`Unsupported embedding provider: ${provider}`);
    }
  }

  private ensureModel(model: EmbeddingModelId): void {
    if (!EMBEDDING_MODELS[model]) {
      throw new Error(`Unsupported embedding model: ${model}`);
    }
  }

  /**
   * Embeds a single text into its corresponding vector.
   * @param params - Parameters for embedding one text.
   * @returns - The embedding result containing the vector and metadata.
   */
  async embedOne(params: EmbedOneParams): Promise<EmbedResult> {
    return this.doEmbedOne({
      text: params.text,
      role: params.role,
    });
  }

  /**
   * Embeds multiple texts into their corresponding vectors.
   * @param params - Parameters for embedding many texts.
   * @returns - An array of embedding results containing vectors and metadata.
   */
  async embedMany(params: EmbedManyParams): Promise<EmbedResult[]> {
    return this.doEmbedMany({
      texts: params.texts,
      role: params.role,
    });
  }

  protected abstract doEmbedOne(params: EmbedOneParams): Promise<EmbedResult>;

  protected abstract doEmbedMany(
    params: EmbedManyParams,
  ): Promise<EmbedResult[]>;

  protected buildMetadata(
    model: EmbeddingModelId,
    embeddedText: string,
  ): EmbeddingResultMetadata {
    const metadata = EMBEDDING_MODELS[model];
    if (!metadata) {
      throw new Error(`Unsupported embedding model: ${model}`);
    }

    return {
      ...metadata,
      generatedAt: new Date().toISOString(),
      embeddedText,
    };
  }
}
