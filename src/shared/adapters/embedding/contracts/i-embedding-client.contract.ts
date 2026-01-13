import {
  EmbedManyParams,
  EmbedOneParams,
  EmbedResult,
} from '../providers/base-embedding-provider.abstract';

// Provider tokens
export const LOCAL_PROVIDER_TOKEN = Symbol('LOCAL_PROVIDER');
export const OPENROUTER_PROVIDER_TOKEN = Symbol('OPENROUTER_PROVIDER');

export interface IEmbeddingClient {
  embedOne(params: EmbedOneParams): Promise<EmbedResult>;
  embedMany(params: EmbedManyParams): Promise<EmbedResult[]>;
}
