import { Injectable } from '@nestjs/common';

import {
  EmbeddingMetadata,
  EmbeddingModel,
  EmbeddingProvider,
} from '../constants/model.constant';
import { IEmbeddingClient } from '../contracts/i-embedding-client.contract';
import { EmbeddingHelper } from '../helpers/embedding.helper';

export type EmbedOneParams = {
  text: string;
  role?: 'query' | 'passage';
};

export type EmbedManyParams = {
  texts: string[];
  role?: 'query' | 'passage';
};

export type EmbeddingResultMetadata = EmbeddingMetadata & {
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
    protected readonly model: EmbeddingModel,
    protected readonly provider: EmbeddingProvider,
  ) {
    if (
      !EmbeddingHelper.isValidModelProviderCombination(
        this.model,
        this.provider,
      )
    ) {
      throw new Error(
        `Unsupported embedding model and provider combination: ${this.model} with ${this.provider}`,
      );
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

  protected buildMetadata(embeddedText: string): EmbeddingResultMetadata {
    const metadata = EmbeddingHelper.getMetadataByModel(this.model);
    if (!metadata) {
      throw new Error(`Unsupported embedding model: ${this.model}`);
    }

    return {
      ...metadata,
      generatedAt: new Date().toISOString(),
      embeddedText,
    };
  }
}
