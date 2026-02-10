import {
  createAnalyticsService,
  createMockLog,
  createMockRepository,
} from '../fixtures/query-analytics.fixtures';

/**
 * Unit tests for QueryAnalyticsService.getTokenBreakdownStats()
 *
 * Tests token statistics (LLM input/output, embedding, total).
 */
describe('QueryAnalyticsService - getTokenBreakdownStats', () => {
  let mockRepository: ReturnType<typeof createMockRepository>;
  let service: ReturnType<typeof createAnalyticsService>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = createAnalyticsService(mockRepository);
  });

  describe('getTokenBreakdownStats', () => {
    it('should compute token statistics from logs', async () => {
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
      const result = await service.getTokenBreakdownStats();

      // Assert
      expect(result.llmInput).toMatchObject({
        count: 2,
        sum: 300,
        average: 150,
        min: 100,
        max: 200,
      });
      expect(result.llmOutput).toMatchObject({
        count: 2,
        sum: 150,
        average: 75,
        min: 50,
        max: 100,
      });
      expect(result.llmTotal).toMatchObject({
        count: 2,
        sum: 450,
        average: 225,
        min: 150,
        max: 300,
      });
      expect(result.total).toMatchObject({
        count: 2,
        sum: 480,
        average: 240,
        min: 160,
        max: 320,
      });
    });

    it('should handle logs with only LLM tokens (no embedding)', async () => {
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
            },
          },
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getTokenBreakdownStats();

      // Assert
      expect(result.llmInput.count).toBe(1);
      expect(result.llmOutput.count).toBe(1);
      expect(result.llmTotal.count).toBe(1);
      expect(result.embeddingTotal.count).toBe(0);
      expect(result.total.count).toBe(1);
    });

    it('should return zero statistics for empty logs', async () => {
      // Arrange
      mockRepository.findManyWithMetrics.mockResolvedValue([]);

      // Act
      const result = await service.getTokenBreakdownStats();

      // Assert
      expect(result.llmInput).toEqual({
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
      });
      expect(result.llmOutput).toEqual({
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
      });
      expect(result.total).toEqual({
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
      });
    });
  });
});
