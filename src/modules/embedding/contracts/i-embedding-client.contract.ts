import {
  EmbedManyParams,
  EmbedOneParams,
  EmbedResult,
} from '../clients/base-embedding.client';

export const I_EMBEDDING_CLIENT_TOKEN = Symbol('I_EMBEDDING_CLIENT');

export interface IEmbeddingClient {
  embedOne(params: EmbedOneParams): Promise<EmbedResult>;
  embedMany(params: EmbedManyParams): Promise<EmbedResult[]>;
}
