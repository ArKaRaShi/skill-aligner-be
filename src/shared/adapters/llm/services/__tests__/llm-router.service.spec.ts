import { z } from 'zod';

import { IModelRegistry } from '../../contracts/i-model-registry.contract';
import { IProviderRegistry } from '../../contracts/i-provider-registry.contract';
import { LlmRouterService } from '../llm-router.service';

describe('LlmRouterService', () => {
  let service: LlmRouterService;
  let mockProviderRegistry: jest.Mocked<IProviderRegistry>;
  let mockModelRegistry: jest.Mocked<IModelRegistry>;

  const mockOpenAIProviderName = 'openai';
  const mockOpenRouterProviderName = 'openrouter';

  const validModel = 'gpt-4o-mini';

  beforeEach(() => {
    // Create mock provider registry
    mockProviderRegistry = {
      registerProvider: jest.fn(),
      getProvider: jest.fn(),
      hasProvider: jest.fn(),
      getAllProviders: jest.fn(),
      unregisterProvider: jest.fn(),
      getProviderCount: jest.fn(),
    };

    // Create mock model registry
    mockModelRegistry = {
      getProvidersForModel: jest.fn(),
      isModelAvailable: jest.fn(),
      getAllModels: jest.fn(),
      isModelRegistered: jest.fn(),
      getModelCount: jest.fn(),
      getModelsForProvider: jest.fn(),
      getProviderForModelId: jest.fn(),
      getModelIdsForModel: jest.fn(),
      getModelIdForProvider: jest.fn(),
      resolveModelId: jest.fn(),
    };

    // Setup default mock behaviors
    mockProviderRegistry.hasProvider.mockImplementation((provider: string) => {
      return (
        provider === mockOpenAIProviderName ||
        provider === mockOpenRouterProviderName
      );
    });

    mockProviderRegistry.getAllProviders.mockReturnValue([
      mockOpenAIProviderName,
      mockOpenRouterProviderName,
    ]);

    // Setup model registry mock behaviors
    mockModelRegistry.isModelRegistered.mockReturnValue(true);
    mockModelRegistry.isModelAvailable.mockReturnValue(true);
    mockModelRegistry.getAllModels.mockReturnValue([validModel]);
    mockModelRegistry.getProvidersForModel.mockReturnValue([
      mockOpenRouterProviderName,
      mockOpenAIProviderName,
    ]);
    mockModelRegistry.resolveModelId.mockImplementation(
      (model: string, provider?: string) => {
        // If model is a model ID (contains '/'), return it as is
        if (model.includes('/')) {
          if (provider) {
            const modelIdProvider = model.split('/')[0];
            if (modelIdProvider !== provider) {
              throw new Error(
                `Model ID '${model}' belongs to provider '${modelIdProvider}', not '${provider}'`,
              );
            }
          }
          return model;
        }
        // Otherwise, return the provider-specific model ID
        const providerName = provider || mockOpenRouterProviderName;
        return providerName === mockOpenRouterProviderName
          ? `openai/${model}`
          : model;
      },
    );
    mockModelRegistry.getProviderForModelId.mockImplementation(
      (modelId: string) => {
        // Return the provider that the model ID is registered with
        // For 'openai/gpt-4o-mini', it should return 'openrouter' (since it's the default)
        // For 'gpt-4o-mini', it should return 'openai' (direct provider)
        if (modelId.includes('/')) {
          return mockOpenRouterProviderName;
        }
        return mockOpenAIProviderName;
      },
    );

    // Create service instance with mocked dependencies
    service = new LlmRouterService(mockProviderRegistry, mockModelRegistry);
  });

  describe('generateText', () => {
    const mockGenerateTextInput = {
      prompt: 'Test prompt',
      systemPrompt: 'Test system prompt',
      model: validModel,
    };

    it('should route to first available provider (openrouter) when no provider specified', async () => {
      mockProviderRegistry.getProvider.mockClear();

      const mockProvider = {
        generateText: jest.fn().mockResolvedValue({
          text: 'Generated text',
          model: validModel,
          inputTokens: 10,
          outputTokens: 20,
        }),
        streamText: jest.fn().mockReturnValue({
          stream: (async function* () {})(),
          usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
        }),
        generateObject: jest.fn(),
        getProviderName: jest.fn().mockReturnValue(mockOpenRouterProviderName),
      };

      mockProviderRegistry.getProvider.mockImplementation(
        (provider: string) => {
          if (provider === mockOpenRouterProviderName) {
            return mockProvider;
          }
          throw new Error(`Unexpected provider: ${provider}`);
        },
      );

      await service.generateText(mockGenerateTextInput);

      expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith(
        mockOpenRouterProviderName,
      );
      expect(mockProvider.generateText).toHaveBeenCalledWith({
        ...mockGenerateTextInput,
        model: `openai/${validModel}`,
      });
    });

    it('should route to specified provider when provider is provided', async () => {
      mockProviderRegistry.getProvider.mockClear();

      const mockProvider = {
        generateText: jest.fn().mockResolvedValue({
          text: 'Generated text',
          model: validModel,
          inputTokens: 10,
          outputTokens: 20,
        }),
        streamText: jest.fn().mockReturnValue({
          stream: (async function* () {})(),
          usage: Promise.resolve({ inputTokens: 10, outputTokens: 20 }),
        }),
        generateObject: jest.fn(),
        getProviderName: jest.fn().mockReturnValue(mockOpenAIProviderName),
      };

      mockProviderRegistry.getProvider.mockImplementation(
        (provider: string) => {
          if (provider === mockOpenAIProviderName) {
            return mockProvider;
          }
          throw new Error(`Unexpected provider: ${provider}`);
        },
      );

      await service.generateText(mockGenerateTextInput, mockOpenAIProviderName);

      expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith(
        mockOpenAIProviderName,
      );
      expect(mockProvider.generateText).toHaveBeenCalledWith({
        ...mockGenerateTextInput,
        model: validModel,
      });
    });

    it('should throw error when specified provider is not found', async () => {
      const invalidProvider = 'invalid-provider';
      mockProviderRegistry.getProvider.mockReturnValue(undefined as any);

      await expect(
        service.generateText(mockGenerateTextInput, invalidProvider),
      ).rejects.toThrow(
        `Provider '${invalidProvider}' not found. Available providers: ${mockOpenAIProviderName}, ${mockOpenRouterProviderName}`,
      );

      expect(mockProviderRegistry.hasProvider).toHaveBeenCalledWith(
        invalidProvider,
      );
      expect(mockProviderRegistry.getAllProviders).toHaveBeenCalled();
      expect(mockProviderRegistry.getProvider).not.toHaveBeenCalled();
    });

    it('should throw error when model is not available on specified provider', async () => {
      mockModelRegistry.getProvidersForModel.mockReturnValue([
        mockOpenRouterProviderName,
      ]);
      mockModelRegistry.resolveModelId.mockReturnValue(undefined);

      await expect(
        service.generateText(mockGenerateTextInput, mockOpenAIProviderName),
      ).rejects.toThrow(
        `Model '${validModel}' is not available on provider '${mockOpenAIProviderName}'. Available providers for this model: ${mockOpenRouterProviderName}`,
      );

      expect(mockModelRegistry.getProvidersForModel).toHaveBeenCalledWith(
        validModel,
      );
      expect(mockProviderRegistry.getProvider).not.toHaveBeenCalled();
    });
  });

  describe('generateObject', () => {
    const testSchema = z.object({
      name: z.string(),
      value: z.number(),
    });

    const mockGenerateObjectInput = {
      prompt: 'Test prompt',
      systemPrompt: 'Test system prompt',
      schema: testSchema,
      model: validModel,
    };

    it('should route to first available provider (openrouter) when no provider specified', async () => {
      mockProviderRegistry.getProvider.mockClear();

      const mockProvider = {
        generateText: jest.fn(),
        streamText: jest.fn().mockReturnValue({
          stream: (async function* () {})(),
          usage: Promise.resolve({ inputTokens: 15, outputTokens: 25 }),
        }),
        generateObject: jest.fn().mockResolvedValue({
          model: validModel,
          inputTokens: 15,
          outputTokens: 25,
          object: { name: 'test', value: 42 },
        }),
        getProviderName: jest.fn().mockReturnValue(mockOpenRouterProviderName),
      };

      mockProviderRegistry.getProvider.mockReturnValue(mockProvider);

      await service.generateObject(mockGenerateObjectInput);

      expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith(
        mockOpenRouterProviderName,
      );
      expect(mockProvider.generateObject).toHaveBeenCalledWith({
        ...mockGenerateObjectInput,
        model: `openai/${validModel}`,
      });
    });

    it('should route to specified provider when provider is provided', async () => {
      mockProviderRegistry.getProvider.mockClear();

      const mockProvider = {
        generateText: jest.fn(),
        streamText: jest.fn().mockReturnValue({
          stream: (async function* () {})(),
          usage: Promise.resolve({ inputTokens: 15, outputTokens: 25 }),
        }),
        generateObject: jest.fn().mockResolvedValue({
          model: validModel,
          inputTokens: 15,
          outputTokens: 25,
          object: { name: 'test', value: 42 },
        }),
        getProviderName: jest.fn().mockReturnValue(mockOpenAIProviderName),
      };

      mockProviderRegistry.getProvider.mockReturnValue(mockProvider);

      await service.generateObject(
        mockGenerateObjectInput,
        mockOpenAIProviderName,
      );

      expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith(
        mockOpenAIProviderName,
      );
      expect(mockProvider.generateObject).toHaveBeenCalledWith({
        ...mockGenerateObjectInput,
        model: validModel,
      });
    });

    it('should throw error when specified provider is not found', async () => {
      const invalidProvider = 'invalid-provider';
      mockProviderRegistry.getProvider.mockReturnValue(undefined as any);

      await expect(
        service.generateObject(mockGenerateObjectInput, invalidProvider),
      ).rejects.toThrow(
        `Provider '${invalidProvider}' not found. Available providers: ${mockOpenAIProviderName}, ${mockOpenRouterProviderName}`,
      );

      expect(mockProviderRegistry.hasProvider).toHaveBeenCalledWith(
        invalidProvider,
      );
      expect(mockProviderRegistry.getAllProviders).toHaveBeenCalled();
      expect(mockProviderRegistry.getProvider).not.toHaveBeenCalled();
    });

    it('should throw error when model is not available on specified provider', async () => {
      mockModelRegistry.getProvidersForModel.mockReturnValue([
        mockOpenRouterProviderName,
      ]);
      mockModelRegistry.resolveModelId.mockReturnValue(undefined);

      await expect(
        service.generateObject(mockGenerateObjectInput, mockOpenAIProviderName),
      ).rejects.toThrow(
        `Model '${validModel}' is not available on provider '${mockOpenAIProviderName}'. Available providers for this model: ${mockOpenRouterProviderName}`,
      );

      expect(mockModelRegistry.getProvidersForModel).toHaveBeenCalledWith(
        validModel,
      );
      expect(mockProviderRegistry.getProvider).not.toHaveBeenCalled();
    });
  });

  describe('provider resolution logic', () => {
    const mockGenerateTextInput = {
      prompt: 'Test prompt',
      systemPrompt: 'Test system prompt',
      model: validModel,
    };

    it('should use first available provider (openrouter)', async () => {
      mockProviderRegistry.getProvider.mockClear();

      const mockProvider = {
        generateText: jest.fn().mockResolvedValue({
          text: 'result',
          model: validModel,
          inputTokens: 0,
          outputTokens: 0,
        }),
        streamText: jest.fn().mockReturnValue({
          stream: (async function* () {})(),
          usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
        }),
        generateObject: jest.fn(),
        getProviderName: jest.fn().mockReturnValue(mockOpenRouterProviderName),
      };

      mockProviderRegistry.getProvider.mockReturnValue(mockProvider);

      await service.generateText(mockGenerateTextInput);

      expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith(
        mockOpenRouterProviderName,
      );
    });

    it('should use specified provider when provided', async () => {
      mockProviderRegistry.getProvider.mockClear();

      const mockProvider = {
        generateText: jest.fn().mockResolvedValue({
          text: 'result',
          model: validModel,
          inputTokens: 0,
          outputTokens: 0,
        }),
        streamText: jest.fn().mockReturnValue({
          stream: (async function* () {})(),
          usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
        }),
        generateObject: jest.fn(),
        getProviderName: jest.fn().mockReturnValue(mockOpenAIProviderName),
      };

      mockProviderRegistry.getProvider.mockReturnValue(mockProvider);

      await service.generateText(mockGenerateTextInput, mockOpenAIProviderName);

      expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith(
        mockOpenAIProviderName,
      );
    });
  });

  describe('error messages', () => {
    const mockGenerateTextInput = {
      prompt: 'Test prompt',
      systemPrompt: 'Test system prompt',
      model: validModel,
    };

    it('should provide helpful error message for missing provider', async () => {
      const invalidProvider = 'invalid-provider';
      mockProviderRegistry.getProvider.mockReturnValue(undefined as any);

      await expect(
        service.generateText(mockGenerateTextInput, invalidProvider),
      ).rejects.toThrow(`Provider '${invalidProvider}' not found`);
    });

    it('should provide helpful error message for model not available on provider', async () => {
      mockModelRegistry.getProvidersForModel.mockReturnValue([
        mockOpenRouterProviderName,
      ]);
      mockModelRegistry.resolveModelId.mockReturnValue(undefined);

      await expect(
        service.generateText(mockGenerateTextInput, mockOpenAIProviderName),
      ).rejects.toThrow(
        `Model '${validModel}' is not available on provider '${mockOpenAIProviderName}'`,
      );
    });

    it('should reject provider-prefixed model ID (e.g., "openai/gpt-4o-mini") without explicit provider', async () => {
      const modelId = 'openai/gpt-4o-mini';

      await expect(
        service.generateText({ ...mockGenerateTextInput, model: modelId }),
      ).rejects.toThrow(
        `Provider-prefixed model IDs like '${modelId}' are not allowed without explicit provider parameter. Use base model name 'gpt-4o-mini' instead, or specify the provider explicitly.`,
      );
    });

    it('should resolve provider-prefixed model ID with different provider (e.g., "openai/gpt-4o-mini" + "openrouter")', async () => {
      const modelId = 'openai/gpt-4o-mini';
      mockProviderRegistry.getProvider.mockClear();

      const mockProvider = {
        generateText: jest.fn().mockResolvedValue({
          text: 'result',
          model: modelId,
          inputTokens: 0,
          outputTokens: 0,
        }),
        streamText: jest.fn().mockReturnValue({
          stream: (async function* () {})(),
          usage: Promise.resolve({ inputTokens: 0, outputTokens: 0 }),
        }),
        generateObject: jest.fn(),
        getProviderName: jest.fn().mockReturnValue(mockOpenRouterProviderName),
      };

      // Model registry should resolve openai/gpt-4o-mini + openrouter → openai/gpt-4o-mini
      mockModelRegistry.resolveModelId.mockImplementation(
        (model: string, provider?: string) => {
          if (
            model === 'openai/gpt-4o-mini' &&
            provider === mockOpenRouterProviderName
          ) {
            return modelId; // openrouter also has this model ID
          }
          if (model.includes('/')) {
            if (provider && model.split('/')[0] !== provider) {
              // Extract base model and resolve to specified provider
              const baseModel = model.split('/').slice(1).join('/');
              if (
                baseModel === validModel &&
                provider === mockOpenRouterProviderName
              ) {
                return modelId;
              }
              return undefined;
            }
            return model;
          }
          const providerName = provider || mockOpenRouterProviderName;
          return providerName === mockOpenRouterProviderName
            ? `openai/${model}`
            : model;
        },
      );

      // getProviderForModelId should return the provider for the resolved model ID
      mockModelRegistry.getProviderForModelId.mockReturnValue(
        mockOpenRouterProviderName,
      );

      // getProvidersForModel should return available providers for the base model
      mockModelRegistry.getProvidersForModel.mockReturnValue([
        mockOpenRouterProviderName,
        mockOpenAIProviderName,
      ]);

      mockProviderRegistry.getProvider.mockReturnValue(mockProvider);
      mockProviderRegistry.hasProvider.mockReturnValue(true);

      await service.generateText(
        { ...mockGenerateTextInput, model: modelId },
        mockOpenRouterProviderName,
      );

      // Should have resolved to openrouter provider with the same model ID
      expect(mockModelRegistry.resolveModelId).toHaveBeenCalledWith(
        modelId,
        mockOpenRouterProviderName,
      );
      expect(mockProviderRegistry.getProvider).toHaveBeenCalledWith(
        mockOpenRouterProviderName,
      );
    });
  });
});
