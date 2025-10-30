import axios, { AxiosError, AxiosInstance } from 'axios';

import {
  EmbedBatchRequest,
  EmbedBatchResponse,
  EmbedRequest,
  EmbedResponse,
  SimilarityBatchRequest,
  SimilarityBatchResponse,
  SimilarityRequest,
  SimilarityResponse,
} from './semantics.dto';

const DEFAULT_BASE_URL =
  process.env.SEMANTICS_API_BASE_URL ??
  'http://localhost:8000/api/v1/semantics';

export type SemanticsClientOptions = {
  baseUrl?: string;
  axiosInstance?: AxiosInstance;
  timeoutMs?: number;
};

/**
 * Thin wrapper around the external semantics service.
 * Provides typed helpers and consistent error handling.
 */
export class SemanticsClient {
  private readonly axios: AxiosInstance;

  constructor(options: SemanticsClientOptions = {}) {
    this.axios =
      options.axiosInstance ??
      axios.create({
        baseURL: this.normalizeBaseUrl(options.baseUrl),
        timeout: options.timeoutMs ?? 15_000,
        headers: { 'Content-Type': 'application/json' },
      });
  }

  async embed(request: EmbedRequest): Promise<EmbedResponse> {
    return this.post<EmbedRequest, EmbedResponse>('/embed', request);
  }

  async batchEmbed(request: EmbedBatchRequest): Promise<EmbedBatchResponse> {
    return this.post<EmbedBatchRequest, EmbedBatchResponse>(
      '/batch_embed',
      request,
    );
  }

  async similarity(request: SimilarityRequest): Promise<SimilarityResponse> {
    return this.post<SimilarityRequest, SimilarityResponse>(
      '/similarity',
      request,
    );
  }

  async batchSimilarity(
    request: SimilarityBatchRequest,
  ): Promise<SimilarityBatchResponse> {
    return this.post<SimilarityBatchRequest, SimilarityBatchResponse>(
      '/batch_similarity',
      request,
    );
  }

  private async post<TRequest extends Record<string, unknown>, TResponse>(
    path: string,
    body: TRequest,
  ): Promise<TResponse> {
    try {
      const response = await this.axios.post<TResponse>(path, body);
      return response.data;
    } catch (error) {
      throw this.toClientError(error);
    }
  }

  private normalizeBaseUrl(baseUrl?: string): string {
    if (!baseUrl || !baseUrl.trim()) {
      return DEFAULT_BASE_URL;
    }
    return baseUrl.replace(/\/+$/, '');
  }

  private toClientError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      return this.fromAxiosError(error);
    }
    return error instanceof Error
      ? error
      : new Error('Unknown error from Semantics API');
  }

  private fromAxiosError(error: AxiosError): Error {
    const status = error.response?.status ?? 'unknown';
    const statusText = error.response?.statusText ?? 'Unknown';
    const data =
      typeof error.response?.data === 'string'
        ? error.response?.data
        : JSON.stringify(error.response?.data);
    return new Error(
      `Semantics API error: ${status} ${statusText} - ${data ?? '<no body>'}`,
    );
  }
}

export const semanticsClient = new SemanticsClient();
