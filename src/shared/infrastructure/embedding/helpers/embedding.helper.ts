import {
  EmbeddingMetadata,
  EmbeddingModel,
  EmbeddingProvider,
  EmbeddingRegistries,
} from '../clients';

export class EmbeddingHelper {
  /**
   * Validates if a model and provider combination is registered.
   * @param model - The embedding model to validate.
   * @param provider - The embedding provider to validate.
   * @returns True if the combination is valid, false otherwise.
   */
  static isValidModelProviderCombination(
    model: EmbeddingModel,
    provider: EmbeddingProvider,
  ): boolean {
    return EmbeddingRegistries.some(
      (entry) => entry.model === model && entry.provider === provider,
    );
  }

  /**
   * Checks if a given embedding configuration is registered.
   * @param config - The embedding configuration to check.
   * @returns True if the configuration is registered, false otherwise.
   */
  static isRegistered(config: EmbeddingMetadata): boolean {
    return EmbeddingRegistries.some(
      (entry) =>
        entry.model === config.model &&
        entry.provider === config.provider &&
        entry.dimension === config.dimension,
    );
  }

  /**
   * Gets the embedding metadata for a given model.
   * @param model - The embedding model to look up.
   * @returns The embedding metadata if found, undefined otherwise.
   */
  static getMetadataByModel(
    model: EmbeddingModel,
  ): EmbeddingMetadata | undefined {
    return EmbeddingRegistries.find((entry) => entry.model === model);
  }
}
