import {
  VectorSearchParams,
  VectorSearchResult,
} from '../types/retrieval.types';

export const VECTOR_ADAPTER = Symbol('VECTOR_ADAPTER');

export interface VectorAdapterContract {
  findSimilarClos(params: VectorSearchParams): Promise<VectorSearchResult[]>;
}
