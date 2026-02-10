import { Injectable } from '@nestjs/common';

import { IEmbeddingClient } from '../contracts/i-embedding-client.contract';
import { IEmbeddingProviderRegistry } from '../contracts/i-embedding-provider-registry.contract';

/**
 * Simple provider registry for embedding providers.
 * Manages embedding provider instances and their availability.
 */
@Injectable()
export class EmbeddingProviderRegistry implements IEmbeddingProviderRegistry {
  private readonly providers = new Map<string, IEmbeddingClient>();

  registerProvider(name: string, provider: IEmbeddingClient): void {
    if (this.providers.has(name)) {
      throw new Error(`Provider '${name}' is already registered.`);
    }
    this.providers.set(name, provider);
  }

  getProvider(name: string): IEmbeddingClient {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(
        `Provider '${name}' not found. Available providers: ${Array.from(this.providers.keys()).join(', ') || 'none'}`,
      );
    }
    return provider;
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  getAllProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  unregisterProvider(name: string): boolean {
    return this.providers.delete(name);
  }

  getProviderCount(): number {
    return this.providers.size;
  }
}
