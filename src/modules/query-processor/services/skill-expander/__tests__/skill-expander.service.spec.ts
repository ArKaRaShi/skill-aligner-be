import { Test } from '@nestjs/testing';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';

import { QuestionSkillCache } from 'src/modules/query-processor/cache/question-skill.cache';
import { SkillExpansionPromptVersion } from 'src/modules/query-processor/prompts/skill-expansion';
import { TSkillExpansion } from 'src/modules/query-processor/types/skill-expansion.type';

import { SkillExpanderService } from '../skill-expander.service';

describe('SkillExpanderService', () => {
  let service: SkillExpanderService;
  let llmRouter: jest.Mocked<ILlmRouterService>;
  let cache: QuestionSkillCache;
  const testModelName = 'test-model';
  const testPromptVersion: SkillExpansionPromptVersion = 'v2';

  beforeEach(async () => {
    const mockLlmRouter = {
      generateObject: jest.fn(),
    };

    const mockCache = {
      lookup: jest.fn(),
      store: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: SkillExpanderService,
          inject: [I_LLM_ROUTER_SERVICE_TOKEN, QuestionSkillCache],
          useFactory: (
            llmRouterService: ILlmRouterService,
            cacheService: QuestionSkillCache,
          ) => {
            return new SkillExpanderService(
              llmRouterService,
              testModelName,
              cacheService,
              true, // useCache = true for V1 tests
            );
          },
        },
        {
          provide: I_LLM_ROUTER_SERVICE_TOKEN,
          useValue: mockLlmRouter,
        },
        {
          provide: QuestionSkillCache,
          useValue: mockCache,
        },
      ],
    }).compile();

    service = module.get(SkillExpanderService);
    llmRouter = module.get(I_LLM_ROUTER_SERVICE_TOKEN);
    cache = module.get(QuestionSkillCache);

    jest.clearAllMocks();
  });

  describe('expandSkills (V1)', () => {
    it('should return cached result when cache hit', async () => {
      // Given: Cache has existing result
      const question = 'What skills do I need for web development?';
      const cachedResult: TSkillExpansion = {
        skillItems: [
          { skill: 'HTML', reason: 'Fundamental markup language' },
          { skill: 'CSS', reason: 'Styling language' },
        ],
        llmInfo: {
          model: testModelName,
          inputTokens: 100,
          outputTokens: 50,
          userPrompt: 'cached prompt',
          systemPrompt: 'cached system',
          promptVersion: 'v1',
        },
        tokenUsage: {
          model: testModelName,
          inputTokens: 100,
          outputTokens: 50,
        },
      };

      cache.lookup = jest.fn().mockReturnValue(cachedResult);

      // When
      const result = await service.expandSkills(question, testPromptVersion);

      // Then
      expect(result).toEqual(cachedResult);
      expect(cache.lookup).toHaveBeenCalledWith(question);
      expect(llmRouter.generateObject).not.toHaveBeenCalled();
    });

    it('should call LLM when cache miss and store result', async () => {
      // Given: Cache miss
      const question = 'What skills do I need for data science?';
      cache.lookup = jest.fn().mockReturnValue(null);

      const llmSkills = [
        { skill: 'Python', reason: 'Essential for data science' },
        { skill: 'Statistics', reason: 'Required for analysis' },
      ];

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: { skills: llmSkills },
        model: testModelName,
        inputTokens: 120,
        outputTokens: 80,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.expandSkills(question, testPromptVersion);

      // Then
      expect(cache.lookup).toHaveBeenCalledWith(question);
      expect(llmRouter.generateObject).toHaveBeenCalledWith({
        prompt: expect.any(String),
        systemPrompt: expect.any(String),
        schema: expect.any(Object),
        model: testModelName,
      });

      expect(result.skillItems).toEqual(llmSkills);
      expect(result.tokenUsage).toEqual({
        model: testModelName,
        inputTokens: 120,
        outputTokens: 80,
      });

      expect(result.llmInfo).toMatchObject({
        model: testModelName,
        provider: 'openrouter',
        inputTokens: 120,
        outputTokens: 80,
        promptVersion: testPromptVersion,
        schemaName: 'SkillExpansionSchema',
        finishReason: 'stop',
        warnings: [],
      });

      expect(cache.store).toHaveBeenCalledWith(question, result);
    });

    it('should handle empty skills array from LLM', async () => {
      // Given
      const question = 'Tell me about cooking';
      cache.lookup = jest.fn().mockReturnValue(null);

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: { skills: [] },
        model: testModelName,
        inputTokens: 50,
        outputTokens: 10,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.expandSkills(question, testPromptVersion);

      // Then
      expect(result.skillItems).toEqual([]);
      expect(result.tokenUsage.inputTokens).toBe(50);
      expect(result.tokenUsage.outputTokens).toBe(10);
    });

    it('should deduplicate duplicate skills from LLM (keeping first occurrence)', async () => {
      // Given: LLM returns skills with duplicates
      const question = 'What skills do I need for full stack development?';
      cache.lookup = jest.fn().mockReturnValue(null);

      const llmSkills = [
        { skill: 'JavaScript', reason: 'Frontend language' },
        { skill: 'Python', reason: 'Backend language' },
        { skill: 'JavaScript', reason: 'Full stack language' }, // Duplicate
        { skill: 'SQL', reason: 'Database language' },
      ];

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: { skills: llmSkills },
        model: testModelName,
        inputTokens: 120,
        outputTokens: 80,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.expandSkills(question, testPromptVersion);

      // Then: Should have 3 unique skills (JavaScript duplicated once removed)
      expect(result.skillItems).toHaveLength(3);
      // First occurrence should be kept
      expect(result.skillItems[0]).toEqual({
        skill: 'JavaScript',
        reason: 'Frontend language',
      });
      expect(result.skillItems[1]).toEqual({
        skill: 'Python',
        reason: 'Backend language',
      });
      expect(result.skillItems[2]).toEqual({
        skill: 'SQL',
        reason: 'Database language',
      });
      // Second JavaScript should be removed
      expect(
        result.skillItems.filter((s) => s.skill === 'JavaScript'),
      ).toHaveLength(1);
    });

    it('should deduplicate case-insensitive skills from LLM', async () => {
      // Given: LLM returns skills with same name but different cases
      const question = 'What skills for web dev?';
      cache.lookup = jest.fn().mockReturnValue(null);

      const llmSkills = [
        { skill: 'javascript', reason: 'All lowercase' },
        { skill: 'JavaScript', reason: 'Camel case' }, // Duplicate (different case)
        { skill: 'JAVASCRIPT', reason: 'All uppercase' }, // Duplicate (different case)
        { skill: 'React', reason: 'Library' },
      ];

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: { skills: llmSkills },
        model: testModelName,
        inputTokens: 100,
        outputTokens: 50,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.expandSkills(question, testPromptVersion);

      // Then: Should have 2 unique skills (all JavaScript variations treated as one)
      expect(result.skillItems).toHaveLength(2);
      // First occurrence should be kept
      expect(result.skillItems[0]).toEqual({
        skill: 'javascript',
        reason: 'All lowercase',
      });
      expect(result.skillItems[1]).toEqual({
        skill: 'React',
        reason: 'Library',
      });
    });
  });

  describe('expandSkillsV2 (V2)', () => {
    it('should call LLM and transform snake_case to camelCase', async () => {
      // Given
      const question = 'What skills do I need for machine learning?';

      const llmSkills = [
        {
          skill: 'Python Programming',
          learning_outcome: 'Can implement ML algorithms',
          reason: 'Core language for ML',
        },
        {
          skill: 'Linear Algebra',
          learning_outcome: 'Understands matrix operations',
          reason: 'Mathematical foundation',
        },
      ];

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: { skills: llmSkills },
        model: testModelName,
        inputTokens: 150,
        outputTokens: 100,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.expandSkillsV2(question, testPromptVersion);

      // Then
      expect(llmRouter.generateObject).toHaveBeenCalledWith({
        prompt: expect.any(String),
        systemPrompt: expect.any(String),
        schema: expect.any(Object), // SkillExpansionV2Schema
        model: testModelName,
      });

      expect(result.skillItems).toHaveLength(2);
      expect(result.skillItems[0]).toEqual({
        skill: 'Python Programming',
        learningOutcome: 'Can implement ML algorithms',
        reason: 'Core language for ML',
      });
      expect(result.skillItems[1]).toEqual({
        skill: 'Linear Algebra',
        learningOutcome: 'Understands matrix operations',
        reason: 'Mathematical foundation',
      });

      expect(result.tokenUsage).toEqual({
        model: testModelName,
        inputTokens: 150,
        outputTokens: 100,
      });

      expect(result.llmInfo).toMatchObject({
        model: testModelName,
        provider: 'openrouter',
        inputTokens: 150,
        outputTokens: 100,
        promptVersion: testPromptVersion,
        schemaName: 'SkillExpansionV2Schema',
        finishReason: 'stop',
        warnings: [],
      });

      // V2 does NOT use cache
      expect(cache.store).not.toHaveBeenCalled();
    });

    it('should handle single skill from LLM', async () => {
      // Given
      const question = 'What skills for Java development?';

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: {
          skills: [
            {
              skill: 'Java Programming',
              learning_outcome: 'Can build OOP applications',
              reason: 'Primary language',
            },
          ],
        },
        model: testModelName,
        inputTokens: 100,
        outputTokens: 60,
        provider: 'openai',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.expandSkillsV2(question, testPromptVersion);

      // Then
      expect(result.skillItems).toHaveLength(1);
      expect(result.skillItems[0].skill).toBe('Java Programming');
      expect(result.skillItems[0].learningOutcome).toBe(
        'Can build OOP applications',
      );
    });

    it('should handle empty skills array from LLM', async () => {
      // Given
      const question = 'Tell me about history';

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: { skills: [] },
        model: testModelName,
        inputTokens: 50,
        outputTokens: 5,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.expandSkillsV2(question, testPromptVersion);

      // Then
      expect(result.skillItems).toEqual([]);
      expect(result.tokenUsage.inputTokens).toBe(50);
      expect(result.tokenUsage.outputTokens).toBe(5);
    });

    it('should build correct TokenUsage and LlmInfo with all metadata', async () => {
      // Given
      const question = 'Test question';

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: {
          skills: [
            {
              skill: 'Test Skill',
              learning_outcome: 'Test outcome',
              reason: 'Test reason',
            },
          ],
        },
        model: testModelName,
        inputTokens: 200,
        outputTokens: 150,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: ['Model warning'],
        providerMetadata: { key: 'value' },
        response: { timestamp: new Date() },
        hyperParameters: { temperature: 0.7 },
      });

      // When
      const result = await service.expandSkillsV2(question, testPromptVersion);

      // Then: Verify TokenUsage
      expect(result.tokenUsage).toEqual({
        model: testModelName,
        inputTokens: 200,
        outputTokens: 150,
      });

      // Then: Verify LlmInfo
      expect(result.llmInfo).toMatchObject({
        model: testModelName,
        provider: 'openrouter',
        inputTokens: 200,
        outputTokens: 150,
        promptVersion: testPromptVersion,
        schemaName: 'SkillExpansionV2Schema',
        finishReason: 'stop',
        warnings: ['Model warning'],
      });
      expect(result.llmInfo.providerMetadata).toEqual({ key: 'value' });
      expect(result.llmInfo.response).toBeDefined();
      expect(result.llmInfo.hyperParameters).toEqual({ temperature: 0.7 });
    });

    it('should deduplicate duplicate skills from LLM (keeping first occurrence)', async () => {
      // Given: LLM returns skills with duplicates
      const question = 'What skills do I need for full stack development?';

      const llmSkills = [
        {
          skill: 'JavaScript',
          learning_outcome: 'Can build frontend',
          reason: 'Frontend language',
        },
        {
          skill: 'Python',
          learning_outcome: 'Can build backend',
          reason: 'Backend language',
        },
        {
          skill: 'JavaScript',
          learning_outcome: 'Can build full stack',
          reason: 'Full stack language',
        }, // Duplicate
        {
          skill: 'SQL',
          learning_outcome: 'Can query databases',
          reason: 'Database language',
        },
      ];

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: { skills: llmSkills },
        model: testModelName,
        inputTokens: 150,
        outputTokens: 100,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.expandSkillsV2(question, testPromptVersion);

      // Then: Should have 3 unique skills (JavaScript duplicated once removed)
      expect(result.skillItems).toHaveLength(3);
      // First occurrence should be kept
      expect(result.skillItems[0]).toEqual({
        skill: 'JavaScript',
        learningOutcome: 'Can build frontend',
        reason: 'Frontend language',
      });
      expect(result.skillItems[1]).toEqual({
        skill: 'Python',
        learningOutcome: 'Can build backend',
        reason: 'Backend language',
      });
      expect(result.skillItems[2]).toEqual({
        skill: 'SQL',
        learningOutcome: 'Can query databases',
        reason: 'Database language',
      });
      // Second JavaScript should be removed
      expect(
        result.skillItems.filter((s) => s.skill === 'JavaScript'),
      ).toHaveLength(1);
    });

    it('should deduplicate case-insensitive skills from LLM', async () => {
      // Given: LLM returns skills with same name but different cases
      const question = 'What skills for web dev?';

      const llmSkills = [
        {
          skill: 'javascript',
          learning_outcome: 'All lowercase outcome',
          reason: 'All lowercase',
        },
        {
          skill: 'JavaScript',
          learning_outcome: 'Camel case outcome',
          reason: 'Camel case',
        }, // Duplicate (different case)
        {
          skill: 'JAVASCRIPT',
          learning_outcome: 'All uppercase outcome',
          reason: 'All uppercase',
        }, // Duplicate (different case)
        {
          skill: 'React',
          learning_outcome: 'Library outcome',
          reason: 'Library',
        },
      ];

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: { skills: llmSkills },
        model: testModelName,
        inputTokens: 120,
        outputTokens: 80,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When
      const result = await service.expandSkillsV2(question, testPromptVersion);

      // Then: Should have 2 unique skills (all JavaScript variations treated as one)
      expect(result.skillItems).toHaveLength(2);
      // First occurrence should be kept
      expect(result.skillItems[0]).toEqual({
        skill: 'javascript',
        learningOutcome: 'All lowercase outcome',
        reason: 'All lowercase',
      });
      expect(result.skillItems[1]).toEqual({
        skill: 'React',
        learningOutcome: 'Library outcome',
        reason: 'Library',
      });
    });
  });

  describe('V1 vs V2 differences', () => {
    it('V1 uses cache, V2 does not use cache', async () => {
      // Given
      const question = 'Test question';
      cache.lookup = jest.fn().mockReturnValue(null);

      llmRouter.generateObject = jest.fn().mockResolvedValue({
        object: { skills: [{ skill: 'Test', reason: 'Test' }] },
        model: testModelName,
        inputTokens: 50,
        outputTokens: 25,
        provider: 'openrouter',
        finishReason: 'stop',
        warnings: [],
      });

      // When: V1
      await service.expandSkills(question, testPromptVersion);

      // Then: V1 uses cache
      expect(cache.lookup).toHaveBeenCalled();
      expect(cache.store).toHaveBeenCalled();

      // Reset mocks
      jest.clearAllMocks();

      // When: V2
      await service.expandSkillsV2(question, testPromptVersion);

      // Then: V2 does NOT use cache
      expect(cache.lookup).not.toHaveBeenCalled();
      expect(cache.store).not.toHaveBeenCalled();
    });

    it('V1 returns 2-field skills, V2 returns 3-field skills', async () => {
      // Given
      const question = 'Test question';
      cache.lookup = jest.fn().mockReturnValue(null);

      llmRouter.generateObject = jest
        .fn()
        // V1 call
        .mockResolvedValueOnce({
          object: {
            skills: [
              { skill: 'Python', reason: 'Test' },
              { skill: 'Java', reason: 'Test' },
            ],
          },
          model: testModelName,
          inputTokens: 50,
          outputTokens: 25,
          provider: 'openrouter',
          finishReason: 'stop',
          warnings: [],
        })
        // V2 call
        .mockResolvedValueOnce({
          object: {
            skills: [
              {
                skill: 'Python',
                learning_outcome: 'Can code in Python',
                reason: 'Test',
              },
            ],
          },
          model: testModelName,
          inputTokens: 50,
          outputTokens: 25,
          provider: 'openrouter',
          finishReason: 'stop',
          warnings: [],
        });

      // When: V1
      const resultV1 = await service.expandSkills(question, testPromptVersion);

      // Then: V1 skills have 2 fields
      expect(resultV1.skillItems).toHaveLength(2);
      expect(resultV1.skillItems[0]).toHaveProperty('skill');
      expect(resultV1.skillItems[0]).toHaveProperty('reason');
      expect(resultV1.skillItems[0]).not.toHaveProperty('learningOutcome');

      // When: V2
      const resultV2 = await service.expandSkillsV2(
        question,
        testPromptVersion,
      );

      // Then: V2 skills have 3 fields
      expect(resultV2.skillItems).toHaveLength(1);
      expect(resultV2.skillItems[0]).toHaveProperty('skill');
      expect(resultV2.skillItems[0]).toHaveProperty('reason');
      expect(resultV2.skillItems[0]).toHaveProperty('learningOutcome');
      expect(resultV2.skillItems[0].learningOutcome).toBe('Can code in Python');
    });
  });
});
