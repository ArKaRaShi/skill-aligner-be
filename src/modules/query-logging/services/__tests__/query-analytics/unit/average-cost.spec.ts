import { DecimalHelper } from 'src/shared/utils/decimal.helper';
import { mockIdWithSuffix } from 'test/fixtures';

import {
  createAnalyticsService,
  createMockLog,
  createMockRepository,
} from '../fixtures/query-analytics.fixtures';

/**
 * Unit tests for QueryAnalyticsService.getAverageCost()
 *
 * Tests average cost calculation across multiple query logs.
 */
describe('QueryAnalyticsService - getAverageCost', () => {
  let mockRepository: ReturnType<typeof createMockRepository>;
  let service: ReturnType<typeof createAnalyticsService>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = createAnalyticsService(mockRepository);
  });

  describe('getAverageCost', () => {
    it('should return zero values when no logs found', async () => {
      // Arrange
      mockRepository.findManyWithMetrics.mockResolvedValue([]);

      // Act
      const result = await service.getAverageCost();

      // Assert
      expect(result).toEqual({ llm: 0, embedding: 0, total: 0 });
      expect(mockRepository.findManyWithMetrics).toHaveBeenCalledWith({
        status: ['COMPLETED'],
        hasMetrics: true,
      });
    });

    it('should compute average cost from multiple logs', async () => {
      // Arrange
      const logs = [
        createMockLog({
          id: mockIdWithSuffix('log', 1),
          totalCost: 0.0075,
          totalTokens: 160,
          metrics: {
            tokenMap: {
              'step1-classification': [
                {
                  usage: {
                    model: 'gpt-4',
                    inputTokens: 100,
                    outputTokens: 50,
                  },
                  costEstimate: {
                    available: true,
                    estimatedCost: 0.0065,
                    model: 'gpt-4',
                    inputTokens: 100,
                    outputTokens: 50,
                  },
                },
              ],
              'step3-course-retrieval': [
                {
                  usage: {
                    model: 'e5-base',
                    inputTokens: 10,
                    outputTokens: 0,
                  },
                  costEstimate: {
                    available: true,
                    estimatedCost: 0.001,
                    model: 'e5-base',
                    inputTokens: 10,
                    outputTokens: 0,
                  },
                },
              ],
            },
          },
        }),
        createMockLog({
          id: mockIdWithSuffix('log', 2),
          totalCost: 0.015,
          totalTokens: 320,
          metrics: {
            tokenMap: {
              'step1-classification': [
                {
                  usage: {
                    model: 'gpt-4',
                    inputTokens: 200,
                    outputTokens: 100,
                  },
                  costEstimate: {
                    available: true,
                    estimatedCost: 0.013,
                    model: 'gpt-4',
                    inputTokens: 200,
                    outputTokens: 100,
                  },
                },
              ],
              'step3-course-retrieval': [
                {
                  usage: {
                    model: 'e5-base',
                    inputTokens: 20,
                    outputTokens: 0,
                  },
                  costEstimate: {
                    available: true,
                    estimatedCost: 0.002,
                    model: 'e5-base',
                    inputTokens: 20,
                    outputTokens: 0,
                  },
                },
              ],
            },
          },
        }),
        createMockLog({
          id: mockIdWithSuffix('log', 3),
          totalCost: 0.0225,
          totalTokens: 480,
          metrics: {
            tokenMap: {
              'step1-classification': [
                {
                  usage: {
                    model: 'gpt-4',
                    inputTokens: 300,
                    outputTokens: 150,
                  },
                  costEstimate: {
                    available: true,
                    estimatedCost: 0.0195,
                    model: 'gpt-4',
                    inputTokens: 300,
                    outputTokens: 150,
                  },
                },
              ],
              'step3-course-retrieval': [
                {
                  usage: {
                    model: 'e5-base',
                    inputTokens: 30,
                    outputTokens: 0,
                  },
                  costEstimate: {
                    available: true,
                    estimatedCost: 0.003,
                    model: 'e5-base',
                    inputTokens: 30,
                    outputTokens: 0,
                  },
                },
              ],
            },
          },
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getAverageCost();

      // Assert - Use DecimalHelper for exact decimal comparisons
      const expectedLlmAvg = DecimalHelper.average([0.0065, 0.013, 0.0195]);
      const expectedEmbeddingAvg = DecimalHelper.average([0.001, 0.002, 0.003]);
      const expectedTotalAvg = DecimalHelper.average([0.0075, 0.015, 0.0225]);

      expect(result.llm).toBe(expectedLlmAvg);
      expect(result.embedding).toBe(expectedEmbeddingAvg);
      expect(result.total).toBe(expectedTotalAvg);
    });

    it('should handle logs with only LLM costs', async () => {
      // Arrange
      const logs = [
        createMockLog({
          id: mockIdWithSuffix('log', 1),
          totalCost: 0.01,
          totalTokens: 150,
          metrics: {
            tokenMap: {
              'step1-classification': [
                {
                  usage: {
                    model: 'gpt-4',
                    inputTokens: 100,
                    outputTokens: 50,
                  },
                  costEstimate: {
                    available: true,
                    estimatedCost: 0.01,
                    model: 'gpt-4',
                    inputTokens: 100,
                    outputTokens: 50,
                  },
                },
              ],
            },
          },
        }),
        createMockLog({
          id: mockIdWithSuffix('log', 2),
          totalCost: 0.02,
          totalTokens: 300,
          metrics: {
            tokenMap: {
              'step1-classification': [
                {
                  usage: {
                    model: 'gpt-4',
                    inputTokens: 200,
                    outputTokens: 100,
                  },
                  costEstimate: {
                    available: true,
                    estimatedCost: 0.02,
                    model: 'gpt-4',
                    inputTokens: 200,
                    outputTokens: 100,
                  },
                },
              ],
            },
          },
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getAverageCost();

      // Assert - Use DecimalHelper for exact decimal comparisons
      const expectedLlmAvg = DecimalHelper.average([0.01, 0.02]);
      const expectedTotalAvg = DecimalHelper.average([0.01, 0.02]);

      expect(result.llm).toBe(expectedLlmAvg);
      expect(result.embedding).toBe(0);
      expect(result.total).toBe(expectedTotalAvg);
    });

    it('should pass date range filters to repository', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      mockRepository.findManyWithMetrics.mockResolvedValue([]);

      // Act
      await service.getAverageCost({ startDate, endDate });

      // Assert
      expect(mockRepository.findManyWithMetrics).toHaveBeenCalledWith({
        startDate,
        endDate,
        status: ['COMPLETED'],
        hasMetrics: true,
      });
    });
  });
});
