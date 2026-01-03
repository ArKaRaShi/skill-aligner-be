import { Injectable, Logger } from '@nestjs/common';

import { ILlmProviderClient } from '../contracts/i-llm-provider-client.contract';
import { IProviderRegistry } from '../contracts/i-provider-registry.contract';

/**
 * Provider registry service.
 * Manages LLM provider instances and their availability.
 * Allows registration and lookup of provider instances by name.
 */
@Injectable()
export class ProviderRegistryService implements IProviderRegistry {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private readonly providers: Map<string, ILlmProviderClient> = new Map();

  /**
   * Registers a provider instance with a name.
   * Overwrites existing registration if provider already exists.
   */
  registerProvider(name: string, provider: ILlmProviderClient): void {
    if (!name) {
      throw new Error('Provider name is required');
    }

    if (!provider) {
      throw new Error(`Provider instance is required for '${name}'`);
    }

    const existing = this.providers.has(name);
    this.providers.set(name, provider);

    if (existing) {
      this.logger.debug(`Updated provider '${name}'`);
    } else {
      this.logger.debug(`Registered provider '${name}'`);
    }
  }

  /**
   * Gets a provider by name.
   */
  getProvider(name: string): ILlmProviderClient {
    if (!name) {
      throw new Error('Provider name is required');
    }

    const provider = this.providers.get(name);

    if (!provider) {
      const availableProviders = this.getAllProviders().join(', ');
      throw new Error(
        `Provider '${name}' not found. Available providers: ${availableProviders || 'none'}`,
      );
    }

    return provider;
  }

  /**
   * Checks if a provider is registered.
   */
  hasProvider(name: string): boolean {
    if (!name) {
      return false;
    }

    return this.providers.has(name);
  }

  /**
   * Gets all registered provider names.
   */
  getAllProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Unregisters a provider.
   */
  unregisterProvider(name: string): boolean {
    if (this.providers.delete(name)) {
      this.logger.debug(`Unregistered provider '${name}'`);
      return true;
    }
    return false;
  }

  /**
   * Gets the total number of registered providers.
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Clears all provider registrations.
   */
  clearRegistrations(): void {
    const count = this.providers.size;
    this.providers.clear();
    this.logger.log(`Cleared ${count} provider registrations`);
  }
}
