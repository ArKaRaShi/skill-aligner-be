import { LLM_MODEL_REGISTRATIONS } from '../../constants/model-registry.constant';
import { ModelRegistryService } from '../model-registry.service';

describe('ModelRegistryService', () => {
  let service: ModelRegistryService;

  beforeEach(() => {
    service = new ModelRegistryService();
  });

  describe('default registrations', () => {
    it('indexes all registrations defined in the constant', () => {
      const uniqueModelCount = new Set(
        LLM_MODEL_REGISTRATIONS.map((registration) => registration.baseModel),
      ).size;

      expect(service.getModelCount()).toBe(uniqueModelCount);
      expect(service.getAllModels()).toEqual(
        expect.arrayContaining(['gpt-4o-mini', 'gpt-4.1-mini']),
      );
    });

    it('maps providers and model identifiers for a base model', () => {
      expect(service.getProvidersForModel('gpt-4o-mini')).toEqual(
        expect.arrayContaining(['openrouter', 'openai']),
      );
      expect(service.getModelIdsForModel('gpt-4o-mini')).toEqual(
        expect.arrayContaining(['openai/gpt-4o-mini', 'gpt-4o-mini']),
      );
      expect(service.getProviderForModelId('openai/gpt-4o-mini')).toBe(
        'openrouter',
      );
      expect(service.getProviderForModelId('gpt-4o-mini')).toBe('openai');
    });
  });

  describe('provider lookups', () => {
    it('returns providers for known and unknown models', () => {
      expect(service.getProvidersForModel('gpt-4.1-mini')).toEqual(
        expect.arrayContaining(['openrouter', 'openai']),
      );
      expect(service.getProvidersForModel('unknown-model')).toEqual([]);
    });

    it('tracks availability per provider', () => {
      expect(service.isModelAvailable('gpt-4.1-mini')).toBe(true);
      expect(service.isModelAvailable('gpt-4.1-mini', 'openai')).toBe(true);
      expect(service.isModelAvailable('gpt-4.1-mini', 'nonexistent')).toBe(
        false,
      );
      expect(service.isModelAvailable('unknown-model')).toBe(false);
    });

    it('lists models per provider and validates input', () => {
      expect(service.getModelsForProvider('openrouter')).toEqual(
        expect.arrayContaining(['gpt-4o-mini', 'gpt-4.1-mini']),
      );
      expect(service.getModelsForProvider('openai')).toEqual(
        expect.arrayContaining(['gpt-4o-mini', 'gpt-4.1-mini']),
      );
      expect(() => service.getModelsForProvider('')).toThrow(
        'Provider name is required',
      );
    });
  });

  describe('model lookups', () => {
    it('returns copies of model identifier lists', () => {
      const ids = service.getModelIdsForModel('gpt-4o-mini');
      ids.push('mutated');

      expect(service.getModelIdsForModel('gpt-4o-mini')).toEqual(
        expect.not.arrayContaining(['mutated']),
      );
    });

    it('indicates registration correctly', () => {
      expect(service.isModelRegistered('gpt-4o-mini')).toBe(true);
      expect(service.isModelRegistered('unknown-model')).toBe(false);
    });

    it('looks up provider-specific IDs', () => {
      expect(service.getModelIdForProvider('gpt-4o-mini', 'openai')).toBe(
        'gpt-4o-mini',
      );
      expect(service.getModelIdForProvider('gpt-4o-mini', 'openrouter')).toBe(
        'openai/gpt-4o-mini',
      );
      expect(
        service.getModelIdForProvider('gpt-4o-mini', 'unknown'),
      ).toBeUndefined();
      expect(service.getModelIdForProvider('', 'openai')).toBeUndefined();
    });
  });

  describe('resolveModelId', () => {
    it('handles provider-specific IDs directly', () => {
      expect(service.resolveModelId('openai/gpt-4o-mini')).toBe(
        'openai/gpt-4o-mini',
      );
      expect(() =>
        service.resolveModelId('openai/gpt-4o-mini', 'openai'),
      ).toThrow(
        "Model ID 'openai/gpt-4o-mini' belongs to provider 'openrouter', not 'openai'. Either remove the provider parameter or use 'openrouter'",
      );
    });

    it('resolves base model names when provider is supplied', () => {
      expect(service.resolveModelId('gpt-4o-mini', 'openrouter')).toBe(
        'openai/gpt-4o-mini',
      );
      expect(service.resolveModelId('gpt-4o-mini', 'openai')).toBe(
        'gpt-4o-mini',
      );
      expect(service.resolveModelId('gpt-4o-mini')).toBeUndefined();
    });
  });
});
