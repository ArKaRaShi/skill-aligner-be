import { EmbedResult } from '../providers/base-embedding-provider.abstract';

export const I_EMBEDDING_ROUTER_SERVICE_TOKEN = Symbol(
  'I_EMBEDDING_ROUTER_SERVICE',
);

/**
 * Parameters for embedding operations (model-first API, like LLM)
 */
export type EmbedOneRouterParams = {
  text: string;
  model: string; // Base model name (e.g., 'e5-base', 'text-embedding-3-small')
  provider?: string; // Optional: specify provider to skip resolution
  role?: 'query' | 'passage';
};

export type EmbedManyRouterParams = {
  texts: string[];
  model: string; // Base model name
  provider?: string; // Optional: specify provider to skip resolution
  role?: 'query' | 'passage';
};

/**
 * Embedding router service interface.
 * Routes embedding requests to appropriate provider based on model.
 * Follows the same pattern as LLM router service.
 */
export interface IEmbeddingRouterService {
  /**
   * Embed a single text using the specified model.
   * Router resolves provider automatically if not specified.
   */
  embedOne(params: EmbedOneRouterParams): Promise<EmbedResult>;

  /**
   * Embed multiple texts using the specified model.
   * Router resolves provider automatically if not specified.
   */
  embedMany(params: EmbedManyRouterParams): Promise<EmbedResult[]>;
}
