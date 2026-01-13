import { IEmbeddingClient } from './i-embedding-client.contract';

/**
 * Interface for embedding provider registry service.
 * Manages embedding provider instances and their availability.
 */
export interface IEmbeddingProviderRegistry {
  /**
   * Registers a provider instance with a name.
   * @param name - The provider name (e.g., "local", "openrouter")
   * @param provider - The provider instance
   */
  registerProvider(name: string, provider: IEmbeddingClient): void;

  /**
   * Gets a provider by name.
   * @param name - The provider name
   * @returns The provider instance
   * @throws Error if provider not found
   */
  getProvider(name: string): IEmbeddingClient;

  /**
   * Checks if a provider is registered.
   * @param name - The provider name
   * @returns true if provider is registered
   */
  hasProvider(name: string): boolean;

  /**
   * Gets all registered provider names.
   * @returns Array of provider names
   */
  getAllProviders(): string[];

  /**
   * Unregisters a provider.
   * @param name - The provider name
   * @returns true if provider was unregistered, false if not found
   */
  unregisterProvider(name: string): boolean;

  /**
   * Gets the total number of registered providers.
   * @returns Number of registered providers
   */
  getProviderCount(): number;
}

export const I_EMBEDDING_PROVIDER_REGISTRY_TOKEN = Symbol(
  'IEmbeddingProviderRegistry',
);
