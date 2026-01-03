import { Test } from '@nestjs/testing';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';

import { QuestionClassifierCache } from 'src/modules/query-processor/cache/question-classifier.cache';
import { QuestionClassifyInput } from 'src/modules/query-processor/contracts/i-question-classifier-service.contract';
import { QuestionClassificationPromptVersion } from 'src/modules/query-processor/prompts/question-classification';
import { TQuestionClassification } from 'src/modules/query-processor/types/question-classification.type';

import { QuestionClassifierService } from '../question-classifier.service';

describe('QuestionClassifierService', () => {
  let service: QuestionClassifierService;
  let llmRouter: jest.Mocked<ILlmRouterService>;
  let cache: jest.Mocked<QuestionClassifierCache>;
  const testModelName = 'test-model';
  const defaultPromptVersion: QuestionClassificationPromptVersion = 'v6';

  const buildInput = (
    question: string,
    promptVersion: QuestionClassificationPromptVersion = defaultPromptVersion,
  ): QuestionClassifyInput => ({
    question,
    promptVersion,
  });

  const _formatPrefilterPromptVersion = (
    version: QuestionClassificationPromptVersion,
  ) => `prefilter with prompt version ${version}`;

  beforeEach(async () => {
    const mockLlmRouter = {
      generateObject: jest.fn(),
      generateText: jest.fn(),
    };

    const mockCache = {
      lookup: jest.fn(),
      store: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: QuestionClassifierService,
          inject: [I_LLM_ROUTER_SERVICE_TOKEN, QuestionClassifierCache],
          useFactory: (
            llmRouterService: ILlmRouterService,
            cache: QuestionClassifierCache,
          ) => {
            return new QuestionClassifierService(
              llmRouterService,
              testModelName,
              cache,
              true, // useCache = true by default for tests
            );
          },
        },
        {
          provide: I_LLM_ROUTER_SERVICE_TOKEN,
          useValue: mockLlmRouter,
        },
        { provide: QuestionClassifierCache, useValue: mockCache },
      ],
    }).compile();

    service = module.get(QuestionClassifierService);
    llmRouter = module.get(I_LLM_ROUTER_SERVICE_TOKEN);
    cache = module.get(QuestionClassifierCache);

    jest.clearAllMocks();
  });

  describe('classify', () => {
    const testQuestion = 'What is Python programming?';

    it('should return cached classification when cache hit occurs', async () => {
      const cachedLlmInfo: LlmInfo = {
        model: 'cached-model',
        userPrompt: testQuestion,
        systemPrompt: 'cached-system-prompt',
        promptVersion: 'v6',
      };
      const cachedClassification: TQuestionClassification = {
        category: 'relevant',
        reason: 'Cached classification',
        llmInfo: cachedLlmInfo,
        tokenUsage: {
          model: 'cached-model',
          inputTokens: 0,
          outputTokens: 0,
        },
      };

      cache.lookup.mockReturnValue(cachedClassification);

      const result = await service.classify(buildInput(testQuestion));

      expect(cache.lookup).toHaveBeenCalledWith(testQuestion);
      expect(result).toEqual(cachedClassification);
      expect(llmRouter.generateObject).not.toHaveBeenCalled();
      expect(cache.store).not.toHaveBeenCalled();
    });

    it('should perform AI classification when cache miss occurs', async () => {
      cache.lookup.mockReturnValue(null);
      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 10,
        outputTokens: 5,
        object: {
          category: 'relevant',
          reason: 'AI classification result',
        },
      });

      const result = await service.classify(buildInput(testQuestion));

      expect(cache.lookup).toHaveBeenCalledWith(testQuestion);
      expect(llmRouter.generateObject).toHaveBeenCalledWith({
        prompt: expect.any(String),
        systemPrompt: expect.any(String),
        schema: expect.any(Object),
        model: testModelName,
      });
      expect(cache.store).toHaveBeenCalledWith(testQuestion, result);
      expect(result.category).toBe('relevant');
      expect(result.reason).toBe('AI classification result');
      expect(result.llmInfo.model).toBe(testModelName);
      expect(result.llmInfo.promptVersion).toBe(defaultPromptVersion);
      expect(result.llmInfo.userPrompt).toContain(testQuestion);
      expect(result.llmInfo.systemPrompt).toBeDefined();
    });

    it('should skip cache when useCache is false', async () => {
      const serviceWithoutCache = new QuestionClassifierService(
        llmRouter,
        testModelName,
        cache,
        false, // useCache = false
      );

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 10,
        outputTokens: 5,
        object: {
          category: 'relevant',
          reason: 'AI classification result',
        },
      });

      const result = await serviceWithoutCache.classify(
        buildInput(testQuestion),
      );

      expect(cache.lookup).not.toHaveBeenCalled();
      expect(cache.store).not.toHaveBeenCalled();
      expect(llmRouter.generateObject).toHaveBeenCalled();
      expect(result.category).toBe('relevant');
    });
  });

  describe('AI-based classification', () => {
    beforeEach(() => {
      cache.lookup.mockReturnValue(null);
    });

    it('should classify relevant content correctly', async () => {
      const relevantQuestion =
        'What are the best Python courses for data science?';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 15,
        outputTokens: 8,
        object: {
          category: 'relevant',
          reason: 'Question about courses and learning',
        },
      });

      const result = await service.classify(buildInput(relevantQuestion));

      expect(result.category).toBe('relevant');
      expect(result.reason).toBe('Question about courses and learning');
      expect(result.llmInfo.model).toBe(testModelName);
      expect(result.llmInfo.promptVersion).toBe(defaultPromptVersion);
      expect(result.llmInfo.userPrompt).toContain(relevantQuestion);
      expect(result.llmInfo.systemPrompt).toBeDefined();
      expect(cache.store).toHaveBeenCalledWith(relevantQuestion, result);
    });

    it('should classify irrelevant content correctly', async () => {
      const irrelevantQuestion = 'What is the weather like today?';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 12,
        outputTokens: 6,
        object: {
          category: 'irrelevant',
          reason: 'Weather question not related to courses',
        },
      });

      const result = await service.classify(buildInput(irrelevantQuestion));

      expect(result.category).toBe('irrelevant');
      expect(result.reason).toBe('Weather question not related to courses');
      expect(result.llmInfo.model).toBe(testModelName);
      expect(result.llmInfo.promptVersion).toBe(defaultPromptVersion);
      expect(cache.store).toHaveBeenCalledWith(irrelevantQuestion, result);
    });

    it('should classify unclear content correctly', async () => {
      const unclearQuestion = 'help';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 8,
        outputTokens: 4,
        object: {
          category: 'irrelevant',
          reason: 'Question too vague to classify',
        },
      });

      const result = await service.classify(buildInput(unclearQuestion));

      expect(result.category).toBe('irrelevant');
      expect(result.reason).toBe('Question too vague to classify');
      expect(result.llmInfo.model).toBe(testModelName);
      expect(result.llmInfo.promptVersion).toBe(defaultPromptVersion);
      expect(cache.store).toHaveBeenCalledWith(unclearQuestion, result);
    });

    it('should use correct prompt version v2', async () => {
      const question = 'Test question';
      const promptVersion = 'v2';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 10,
        outputTokens: 5,
        object: {
          category: 'relevant',
          reason: 'Test classification',
        },
      });

      const result = await service.classify(
        buildInput(question, promptVersion),
      );

      expect(result.llmInfo.promptVersion).toBe(promptVersion);
      expect(llmRouter.generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          model: testModelName,
        }),
      );
    });

    it('should handle LLM provider errors gracefully', async () => {
      const question = 'Test question';
      const promptVersion: QuestionClassificationPromptVersion = 'v2';
      const errorMessage = 'LLM provider error';

      llmRouter.generateObject.mockRejectedValue(new Error(errorMessage));

      await expect(
        service.classify(buildInput(question, promptVersion)),
      ).rejects.toThrow(errorMessage);
      expect(cache.store).not.toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    beforeEach(() => {
      cache.lookup.mockReturnValue(null);
    });

    it('should handle empty string questions', async () => {
      const emptyQuestion = '';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 5,
        outputTokens: 3,
        object: {
          category: 'irrelevant',
          reason: 'Empty question',
        },
      });

      const result = await service.classify(buildInput(emptyQuestion));

      expect(result.category).toBe('irrelevant');
      expect(llmRouter.generateObject).toHaveBeenCalled();
    });

    it('should handle whitespace-only questions', async () => {
      const whitespaceQuestion = '   \t\n   ';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 5,
        outputTokens: 3,
        object: {
          category: 'irrelevant',
          reason: 'Whitespace only question',
        },
      });

      const result = await service.classify(buildInput(whitespaceQuestion));

      expect(result.category).toBe('irrelevant');
      expect(llmRouter.generateObject).toHaveBeenCalled();
    });

    it('should handle very long questions', async () => {
      const longQuestion = 'a'.repeat(10000);

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 100,
        outputTokens: 10,
        object: {
          category: 'irrelevant',
          reason: 'Very long question',
        },
      });

      const result = await service.classify(buildInput(longQuestion));

      expect(result.category).toBe('irrelevant');
      expect(llmRouter.generateObject).toHaveBeenCalled();
    });

    it('should handle questions with special characters', async () => {
      const specialCharQuestion = 'What is @#$%^&*() programming?';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 15,
        outputTokens: 8,
        object: {
          category: 'relevant',
          reason: 'Question with special characters',
        },
      });

      const result = await service.classify(buildInput(specialCharQuestion));

      expect(result.category).toBe('relevant');
      expect(llmRouter.generateObject).toHaveBeenCalled();
    });

    it('should handle questions with unicode characters', async () => {
      const unicodeQuestion = 'วิธีเรียนโปรแกรมมิ่ง 🚀';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 15,
        outputTokens: 8,
        object: {
          category: 'relevant',
          reason: 'Unicode question',
        },
      });

      const result = await service.classify(buildInput(unicodeQuestion));

      expect(result.category).toBe('relevant');
      expect(llmRouter.generateObject).toHaveBeenCalled();
    });
  });

  describe('cache behavior', () => {
    it('should store classification in cache after AI classification', async () => {
      const question = 'Test question';
      const promptVersion: QuestionClassificationPromptVersion = 'v2';

      cache.lookup.mockReturnValue(null);
      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 10,
        outputTokens: 5,
        object: {
          category: 'relevant',
          reason: 'Test reason',
        },
      });

      await service.classify(buildInput(question, promptVersion));

      expect(cache.store).toHaveBeenCalledWith(
        question,
        expect.objectContaining({
          category: 'relevant',
          reason: 'Test reason',
          llmInfo: expect.objectContaining({
            model: testModelName,
            promptVersion,
          }),
        }),
      );
    });

    it('should not store in cache when useCache is false', async () => {
      const serviceWithoutCache = new QuestionClassifierService(
        llmRouter,
        testModelName,
        cache,
        false, // useCache = false
      );

      const question = 'Test question';
      const promptVersion: QuestionClassificationPromptVersion = 'v2';

      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 10,
        outputTokens: 5,
        object: {
          category: 'relevant',
          reason: 'Test reason',
        },
      });

      await serviceWithoutCache.classify(buildInput(question, promptVersion));

      expect(cache.store).not.toHaveBeenCalled();
    });

    it('should propagate cache store errors', async () => {
      const question = 'Test question';
      const promptVersion: QuestionClassificationPromptVersion = 'v2';

      cache.lookup.mockReturnValue(null);
      cache.store.mockImplementation(() => {
        throw new Error('Cache store error');
      });
      llmRouter.generateObject.mockResolvedValue({
        model: testModelName,
        inputTokens: 10,
        outputTokens: 5,
        object: {
          category: 'relevant',
          reason: 'Test reason',
        },
      });

      // The service should propagate cache store errors
      await expect(
        service.classify(buildInput(question, promptVersion)),
      ).rejects.toThrow('Cache store error');
    });
  });
});
