import { ILlmProviderClient } from './i-llm-provider-client.contract';

/**
 * Interface for provider registry service.
 * Manages LLM provider instances and their availability.
 */
export interface IProviderRegistry {
  /**
   * Registers a provider instance with a name.
   * @param name - The provider name (e.g., "openai", "openrouter")
   * @param provider - The provider instance
   */
  registerProvider(name: string, provider: ILlmProviderClient): void;

  /**
   * Gets a provider by name.
   * @param name - The provider name
   * @returns The provider instance
   * @throws Error if provider not found
   */
  getProvider(name: string): ILlmProviderClient;

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

export const I_PROVIDER_REGISTRY_TOKEN = Symbol('IProviderRegistry');
