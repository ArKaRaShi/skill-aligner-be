import { Test } from '@nestjs/testing';

import { I_QUESTION_ANALYTICS_REPOSITORY_TOKEN } from '../../contracts/repositories/i-question-analytics-repository.contract';
import type { IQuestionAnalyticsRepository } from '../../contracts/repositories/i-question-analytics-repository.contract';
import type {
  EntityQuestionExamples,
  LifetimeStats,
  QualityDistribution,
  TopQuestion,
  TrendingResult,
} from '../../types/analytics.types';
import { QuestionAnalyticsService } from '../question-analytics.service';

describe('QuestionAnalyticsService (Unit)', () => {
  let service: QuestionAnalyticsService;
  let repository: jest.Mocked<IQuestionAnalyticsRepository>;

  beforeEach(async () => {
    const mockRepository = {
      getTrending: jest.fn(),
      getEntityQuestionExamples: jest.fn(),
      getLifetimeStats: jest.fn(),
      getQualityDistribution: jest.fn(),
      getTopQuestions: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        {
          provide: QuestionAnalyticsService,
          useFactory: (repo: IQuestionAnalyticsRepository) => {
            return new QuestionAnalyticsService(repo);
          },
          inject: [I_QUESTION_ANALYTICS_REPOSITORY_TOKEN],
        },
        {
          provide: I_QUESTION_ANALYTICS_REPOSITORY_TOKEN,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get(QuestionAnalyticsService);
    repository = module.get(I_QUESTION_ANALYTICS_REPOSITORY_TOKEN);

    jest.clearAllMocks();
  });

  describe('getTrending', () => {
    it('should return trending results', async () => {
      const mockData: TrendingResult[] = [
        {
          entityType: 'skill',
          normalizedLabel: 'python',
          count: 42,
          period: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31'),
          },
        },
      ];

      repository.getTrending.mockResolvedValue(mockData);

      const result = await service.getTrending(
        'skill',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        10,
      );

      expect(result).toEqual(mockData);
      expect(repository.getTrending).toHaveBeenCalledWith(
        'skill',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        10,
      );
    });

    it('should return empty array when no data', async () => {
      repository.getTrending.mockResolvedValue([]);

      const result = await service.getTrending(
        'skill',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        10,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getEntityQuestionExamples', () => {
    it('should return entity question examples', async () => {
      const mockData: EntityQuestionExamples = {
        entity: {
          type: 'skill',
          normalizedLabel: 'python',
          name: 'Python',
        },
        examples: [
          {
            questionLogId: 'test-id',
            questionText: 'I want to learn Python',
            extractedAt: new Date('2024-01-15'),
            entities: [
              {
                type: 'skill',
                normalizedLabel: 'python',
                name: 'Python',
              },
            ],
          },
        ],
        totalQuestions: 1,
      };

      repository.getEntityQuestionExamples.mockResolvedValue(mockData);

      const result = await service.getEntityQuestionExamples(
        'skill',
        'python',
        5,
      );

      expect(result).toEqual(mockData);
      expect(repository.getEntityQuestionExamples).toHaveBeenCalledWith(
        'skill',
        'python',
        5,
      );
    });
  });

  describe('getLifetimeStats', () => {
    it('should return lifetime statistics', async () => {
      const mockData: LifetimeStats = {
        totalExtractions: 1234,
        totalCost: 12.34,
        averageTokensPerExtraction: 150.5,
        totalQuestionsProcessed: 500,
        qualityDistribution: {
          high: 800,
          medium: 300,
          low: 100,
          none: 34,
        },
      };

      repository.getLifetimeStats.mockResolvedValue(mockData);

      const result = await service.getLifetimeStats();

      expect(result).toEqual(mockData);
      expect(repository.getLifetimeStats).toHaveBeenCalled();
    });
  });

  describe('getQualityDistribution', () => {
    it('should return quality distribution', async () => {
      const mockData: QualityDistribution = {
        high: 800,
        medium: 300,
        low: 100,
        none: 34,
      };

      repository.getQualityDistribution.mockResolvedValue(mockData);

      const result = await service.getQualityDistribution();

      expect(result).toEqual(mockData);
      expect(repository.getQualityDistribution).toHaveBeenCalled();
    });
  });

  describe('getTopQuestions', () => {
    it('should return top questions', async () => {
      const mockData: TopQuestion[] = [
        {
          questionLogId: 'test-id',
          questionText: 'I want to learn Python',
          extractionCount: 5,
          lastExtractedAt: new Date('2024-01-15'),
        },
      ];

      repository.getTopQuestions.mockResolvedValue(mockData);

      const result = await service.getTopQuestions(10);

      expect(result).toEqual(mockData);
      expect(repository.getTopQuestions).toHaveBeenCalledWith(10);
    });
  });
});
