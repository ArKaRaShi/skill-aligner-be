import { Test } from '@nestjs/testing';

import type { GenerateObjectOutput } from 'src/shared/adapters/llm/contracts/i-llm-provider-client.contract';
import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  type ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import type { Identifier } from 'src/shared/contracts/types/identifier';

import { I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN } from '../../contracts/repositories/i-question-log-analysis-repository.contract';
import type { IQuestionLogAnalysisRepository } from '../../contracts/repositories/i-question-log-analysis-repository.contract';
import {
  I_QUESTION_LOG_REPOSITORY_TOKEN,
  type IQuestionLogRepository,
} from '../../contracts/repositories/i-question-log-repository.contract';
import type { EntityExtraction } from '../../schemas/entity-extraction.schema';
import { QuestionExtractionService } from '../question-extraction.service';

describe('QuestionExtractionService (Unit)', () => {
  let service: QuestionExtractionService;
  let llmRouter: jest.Mocked<ILlmRouterService>;
  let repository: jest.Mocked<IQuestionLogAnalysisRepository>;
  let questionLogRepository: jest.Mocked<IQuestionLogRepository>;

  const mockQuestionLogId =
    '11111111-1111-1111-1111-111111111111' as Identifier;

  beforeEach(async () => {
    const mockLlmRouter = {
      generateObject: jest.fn(),
    };

    const mockRepository = {
      create: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
      findByQuestionLogId: jest.fn(),
      getNextExtractionNumber: jest.fn(),
    };

    const mockQuestionLogRepository = {
      findById: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByProcessLogId: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: QuestionExtractionService,
          useFactory: (
            repo: IQuestionLogAnalysisRepository,
            questionLogRepo: IQuestionLogRepository,
            llm: ILlmRouterService,
          ) => {
            return new QuestionExtractionService(
              repo,
              questionLogRepo,
              llm,
              'gpt-4o-mini', // Mock model name
            );
          },
          inject: [
            I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN,
            I_QUESTION_LOG_REPOSITORY_TOKEN,
            I_LLM_ROUTER_SERVICE_TOKEN,
          ],
        },
        {
          provide: I_LLM_ROUTER_SERVICE_TOKEN,
          useValue: mockLlmRouter,
        },
        {
          provide: I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
        {
          provide: I_QUESTION_LOG_REPOSITORY_TOKEN,
          useValue: mockQuestionLogRepository,
        },
      ],
    }).compile();

    service = module.get(QuestionExtractionService);
    llmRouter = module.get(I_LLM_ROUTER_SERVICE_TOKEN);
    repository = module.get(I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN);
    questionLogRepository = module.get(I_QUESTION_LOG_REPOSITORY_TOKEN);

    jest.clearAllMocks();
  });

  describe('extractFromQuestion', () => {
    const mockExtractionResult: EntityExtraction = {
      mentionTopics: [
        {
          name: 'Machine Learning',
          normalizedLabel: 'machine-learning',
          confidence: 'HIGH',
          source: 'explicit',
        },
      ],
      mentionSkills: [
        {
          name: 'Python',
          normalizedLabel: 'python',
          confidence: 'HIGH',
          source: 'explicit',
        },
      ],
      mentionTasks: [],
      mentionRoles: [],
      unmappedConcepts: [],
      overallQuality: 'high',
      reasoning: 'Clear learning intent',
    };

    const mockLlmResponse: GenerateObjectOutput<any> = {
      model: 'gpt-4o-mini',
      inputTokens: 100,
      outputTokens: 50,
      object: mockExtractionResult,
    };

    beforeEach(() => {
      questionLogRepository.findById.mockResolvedValue({
        id: mockQuestionLogId,
        questionText: 'I want to learn Python for machine learning',
        role: null,
        metadata: null,
        createdAt: new Date(),
        relatedProcessLogId: null,
      });
      repository.getNextExtractionNumber.mockResolvedValue(1);
      llmRouter.generateObject.mockResolvedValue(mockLlmResponse);
    });

    it('should extract entities and store analysis', async () => {
      const mockAnalysis = {
        id: 'analysis-1',
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
        extractionNumber: 1,
        modelUsed: 'gpt-4o-mini',
        overallQuality: 'high',
        entityCounts: { topics: 1, skills: 1, tasks: 0, roles: 0 },
        extractionCost: 0.001,
        tokensUsed: 150,
        reasoning: 'Clear learning intent',
        llm: {
          model: 'gpt-4o-mini',
          inputTokens: 100,
          outputTokens: 50,
        },
        createdAt: new Date(),
        extractedAt: new Date(),
        entities: [
          {
            id: 'entity-1',
            type: 'topic' as const,
            name: 'Machine Learning',
            normalizedLabel: 'machine-learning',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
            createdAt: new Date(),
          },
          {
            id: 'entity-2',
            type: 'skill' as const,
            name: 'Python',
            normalizedLabel: 'python',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
            createdAt: new Date(),
          },
        ],
      };

      repository.create.mockResolvedValue(mockAnalysis as any);

      const result = await service.extractFromQuestion({
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
        model: 'gpt-4o-mini',
      });

      expect(result.analysis.id).toBeDefined();
      expect(result.analysis.overallQuality).toBe('high');
      expect(result.entities).toHaveLength(2);
      // Verify entities were passed to repository
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entities: expect.arrayContaining([
            expect.objectContaining({ type: 'topic' }),
            expect.objectContaining({ type: 'skill' }),
          ]),
        }),
      );
    });

    it('should call LLM with correct parameters', async () => {
      const mockAnalysis = {
        id: 'analysis-1',
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
        extractionNumber: 1,
        modelUsed: 'gpt-4o-mini',
        overallQuality: 'high',
        entityCounts: { topics: 1, skills: 1, tasks: 0, roles: 0 },
        extractionCost: 0.001,
        tokensUsed: 150,
        reasoning: 'Clear learning intent',
        llm: null,
        createdAt: new Date(),
        extractedAt: new Date(),
        entities: [
          {
            id: 'entity-1',
            type: 'topic' as const,
            name: 'Machine Learning',
            normalizedLabel: 'machine-learning',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
            createdAt: new Date(),
          },
          {
            id: 'entity-2',
            type: 'skill' as const,
            name: 'Python',
            normalizedLabel: 'python',
            confidence: 'HIGH' as const,
            source: 'explicit' as const,
            createdAt: new Date(),
          },
        ],
      };

      repository.create.mockResolvedValue(mockAnalysis as any);

      await service.extractFromQuestion({
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
        model: 'gpt-4o-mini',
      });

      expect(llmRouter.generateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
        }),
      );
    });

    it('should auto-increment extraction number', async () => {
      const mockAnalysis = {
        id: 'analysis-1',
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
        extractionNumber: 1,
        modelUsed: 'gpt-4o-mini',
        overallQuality: 'high',
        entityCounts: { topics: 1, skills: 1, tasks: 0, roles: 0 },
        extractionCost: 0.001,
        tokensUsed: 150,
        reasoning: 'Clear learning intent',
        llm: null,
        createdAt: new Date(),
        extractedAt: new Date(),
        entities: [],
      };

      repository.getNextExtractionNumber
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2);
      repository.create.mockResolvedValue(mockAnalysis as any);

      await service.extractFromQuestion({
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
      });

      await service.extractFromQuestion({
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
      });

      expect(repository.getNextExtractionNumber).toHaveBeenCalledTimes(2);
    });

    it('should calculate entity counts correctly', async () => {
      const mockAnalysis = {
        id: 'analysis-1',
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
        extractionNumber: 1,
        modelUsed: 'gpt-4o-mini',
        overallQuality: 'high',
        entityCounts: { topics: 1, skills: 1, tasks: 0, roles: 0 },
        extractionCost: 0.001,
        tokensUsed: 150,
        reasoning: 'Clear learning intent',
        llm: null,
        createdAt: new Date(),
        extractedAt: new Date(),
        entities: [],
      };

      repository.create.mockResolvedValue(mockAnalysis as any);

      const result = await service.extractFromQuestion({
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
      });

      expect(result.analysis.entityCounts).toEqual({
        topics: 1,
        skills: 1,
        tasks: 0,
        roles: 0,
      });
    });

    it('should handle empty extraction', async () => {
      const emptyResponse: GenerateObjectOutput<any> = {
        model: 'gpt-4o-mini',
        inputTokens: 50,
        outputTokens: 20,
        object: {
          mentionTopics: [],
          mentionSkills: [],
          mentionTasks: [],
          mentionRoles: [],
          unmappedConcepts: [],
          overallQuality: 'none',
          reasoning: 'No entities found',
        },
      };

      const mockAnalysis = {
        id: 'analysis-1',
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
        extractionNumber: 1,
        modelUsed: 'gpt-4o-mini',
        overallQuality: 'none',
        entityCounts: { topics: 0, skills: 0, tasks: 0, roles: 0 },
        extractionCost: 0.001,
        tokensUsed: 70,
        reasoning: 'No entities found',
        llm: null,
        createdAt: new Date(),
        extractedAt: new Date(),
        entities: [],
      };

      llmRouter.generateObject.mockResolvedValue(emptyResponse);
      repository.create.mockResolvedValue(mockAnalysis as any);

      const result = await service.extractFromQuestion({
        questionLogId: mockQuestionLogId,
        extractionVersion: 'v1',
      });

      expect(result.analysis.overallQuality).toBe('none');
      expect(result.analysis.entityCounts).toEqual({
        topics: 0,
        skills: 0,
        tasks: 0,
        roles: 0,
      });
    });
  });

  describe('getExtractionHistory', () => {
    it('should return empty array for question with no extractions', async () => {
      repository.findByQuestionLogId.mockResolvedValue([]);

      const result = await service.getExtractionHistory(mockQuestionLogId);

      expect(result).toEqual([]);
      expect(repository.findByQuestionLogId).toHaveBeenCalledWith(
        mockQuestionLogId,
      );
    });

    it('should return extraction history', async () => {
      const mockAnalyses = [
        {
          id: 'analysis-1' as Identifier,
          questionLogId: mockQuestionLogId,
          extractionVersion: 'v1',
          extractionNumber: 1,
          modelUsed: 'gpt-4o-mini',
          overallQuality: 'high',
          entityCounts: { topics: 1, skills: 1, tasks: 0, roles: 0 },
          extractionCost: 0.001,
          tokensUsed: 100,
          reasoning: 'First extraction',
          llm: null,
          createdAt: new Date('2024-01-01'),
        },
      ];

      repository.findByQuestionLogId.mockResolvedValue(mockAnalyses as any);

      const result = await service.getExtractionHistory(mockQuestionLogId);

      expect(result).toHaveLength(1);
      expect(result[0].extractionVersion).toBe('v1');
      expect(result[0].extractionNumber).toBe(1);
    });
  });
});
