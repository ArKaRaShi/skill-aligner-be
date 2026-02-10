import {
  createAnalyticsService,
  createMockLog,
  createMockRepository,
} from '../fixtures/query-analytics.fixtures';

/**
 * Unit tests for QueryAnalyticsService.getCombinedAnalytics()
 *
 * Tests combined cost and token statistics.
 */
describe('QueryAnalyticsService - getCombinedAnalytics', () => {
  let mockRepository: ReturnType<typeof createMockRepository>;
  let service: ReturnType<typeof createAnalyticsService>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = createAnalyticsService(mockRepository);
  });

  describe('getCombinedAnalytics', () => {
    it('should return both cost and token statistics', async () => {
      // Arrange
      const logs = [
        createMockLog({
          id: 'log-1' as any,
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
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getCombinedAnalytics();

      // Assert
      expect(result.costs).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(result.costs.total.count).toBe(1);
      expect(result.tokens.llmInput.count).toBe(1);
    });
  });
});
