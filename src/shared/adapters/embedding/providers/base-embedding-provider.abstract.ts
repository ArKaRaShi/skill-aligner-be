import { Injectable } from '@nestjs/common';

import { IEmbeddingClient } from '../contracts/i-embedding-client.contract';

export type EmbedOneParams = {
  text: string;
  role?: 'query' | 'passage';
};

export type EmbedManyParams = {
  texts: string[];
  role?: 'query' | 'passage';
};

export type EmbeddingResultMetadata = {
  model: string;
  provider: string;
  dimension: number;
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
    protected readonly model: string,
    protected readonly provider: string,
    protected readonly dimension: number,
  ) {
    // Validation is now handled by the registry/router, not here
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

  protected buildMetadata(embeddedText: string): EmbeddingResultMetadata {
    return {
      model: this.model,
      provider: this.provider,
      dimension: this.dimension,
      generatedAt: new Date().toISOString(),
      embeddedText,
    };
  }
}
