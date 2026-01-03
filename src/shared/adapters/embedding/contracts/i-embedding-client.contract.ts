import {
  EmbedManyParams,
  EmbedOneParams,
  EmbedResult,
} from '../providers/base-embedding-provider.abstract';

// Token removed - use I_EMBEDDING_ROUTER_SERVICE_TOKEN instead
// export const I_EMBEDDING_CLIENT_TOKEN = Symbol('I_EMBEDDING_CLIENT');

export interface IEmbeddingClient {
  embedOne(params: EmbedOneParams): Promise<EmbedResult>;
  embedMany(params: EmbedManyParams): Promise<EmbedResult[]>;
}
