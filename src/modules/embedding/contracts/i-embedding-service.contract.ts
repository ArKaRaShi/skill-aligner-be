import {
  EmbedManyParams,
  EmbedOneParams,
  EmbedResult,
} from '../services/base-embedding.service';

export const I_EMBEDDING_SERVICE_TOKEN = Symbol('I_EMBEDDING_SERVICE');

export interface IEmbeddingService {
  embedOne(params: EmbedOneParams): Promise<EmbedResult>;
  embedMany(params: EmbedManyParams): Promise<EmbedResult[]>;
}
