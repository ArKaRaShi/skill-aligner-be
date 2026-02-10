import { DecimalHelper } from '../../../../../../shared/utils/decimal.helper';
import {
  createAnalyticsService,
  createMockLog,
  createMockRepository,
} from '../fixtures/query-analytics.fixtures';

/**
 * Unit tests for QueryAnalyticsService.getCostBreakdownStats()
 *
 * Tests cost statistics including sum, average, min, max across query logs.
 */
describe('QueryAnalyticsService - getCostBreakdownStats', () => {
  let mockRepository: ReturnType<typeof createMockRepository>;
  let service: ReturnType<typeof createAnalyticsService>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = createAnalyticsService(mockRepository);
  });

  describe('getCostBreakdownStats', () => {
    it('should compute full statistics breakdown', async () => {
      // Arrange
      const logs = [
        createMockLog({
          id: 'log-1' as any,
          totalCost: 0.011,
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
                    estimatedCost: 0.01,
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
          id: 'log-2' as any,
          totalCost: 0.022,
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
                    estimatedCost: 0.02,
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
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getCostBreakdownStats();

      // Assert - Use DecimalHelper for exact decimal comparisons
      const llmCosts = [0.01, 0.02];
      const embeddingCosts = [0.001, 0.002];
      const totalCosts = [0.011, 0.022];

      expect(result.llm.count).toBe(2);
      expect(result.llm.sum).toBe(DecimalHelper.sum(...llmCosts));
      expect(result.llm.average).toBe(DecimalHelper.average(llmCosts));
      expect(result.llm.min).toBe(DecimalHelper.min(...llmCosts));
      expect(result.llm.max).toBe(DecimalHelper.max(...llmCosts));
      expect(result.embedding.count).toBe(2);
      expect(result.embedding.sum).toBe(DecimalHelper.sum(...embeddingCosts));
      expect(result.embedding.average).toBe(
        DecimalHelper.average(embeddingCosts),
      );
      expect(result.embedding.min).toBe(DecimalHelper.min(...embeddingCosts));
      expect(result.embedding.max).toBe(DecimalHelper.max(...embeddingCosts));
      expect(result.total.count).toBe(2);
      expect(result.total.sum).toBe(DecimalHelper.sum(...totalCosts));
      expect(result.total.average).toBe(DecimalHelper.average(totalCosts));
      expect(result.total.min).toBe(DecimalHelper.min(...totalCosts));
      expect(result.total.max).toBe(DecimalHelper.max(...totalCosts));
    });

    it('should use COMPLETED status by default', async () => {
      // Arrange
      mockRepository.findManyWithMetrics.mockResolvedValue([]);

      // Act
      await service.getCostBreakdownStats();

      // Assert
      expect(mockRepository.findManyWithMetrics).toHaveBeenCalledWith({
        status: ['COMPLETED'],
        hasMetrics: true,
      });
    });

    it('should respect custom status filter', async () => {
      // Arrange
      mockRepository.findManyWithMetrics.mockResolvedValue([]);

      // Act
      await service.getCostBreakdownStats({
        status: ['FAILED', 'TIMEOUT'] as any,
      });

      // Assert
      expect(mockRepository.findManyWithMetrics).toHaveBeenCalledWith({
        status: ['FAILED', 'TIMEOUT'] as any,
        hasMetrics: true,
      });
    });
  });
});
