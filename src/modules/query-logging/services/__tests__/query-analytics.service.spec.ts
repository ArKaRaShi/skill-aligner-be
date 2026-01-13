import type { Identifier } from '../../../../shared/contracts/types/identifier';
import type { IQueryLoggingRepository } from '../../contracts/i-query-logging-repository.contract';
import type { QueryProcessLog } from '../../types/query-log.type';
import type { QueryStatus } from '../../types/query-status.type';
import { QueryAnalyticsService } from '../query-analytics.service';

describe('QueryAnalyticsService', () => {
  let service: QueryAnalyticsService;
  let mockRepository: jest.Mocked<IQueryLoggingRepository>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findManyWithMetrics: jest.fn(),
    } as unknown as jest.Mocked<IQueryLoggingRepository>;

    service = new QueryAnalyticsService(mockRepository);
  });

  const createMockLog = (
    overrides?: Partial<QueryProcessLog>,
  ): QueryProcessLog => ({
    id: 'log-1' as Identifier,
    status: 'COMPLETED' as QueryStatus,
    question: 'Test question',
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:01:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:01:00Z'),
    metrics: {
      costs: {
        llm: 0.01,
        embedding: 0.001,
        total: 0.011,
      },
      totalDuration: 60000,
    },
    ...overrides,
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
          metrics: { costs: { llm: 0.01, embedding: 0.001, total: 0.011 } },
        }),
        createMockLog({
          metrics: { costs: { llm: 0.02, embedding: 0.002, total: 0.022 } },
        }),
        createMockLog({
          metrics: { costs: { llm: 0.03, embedding: 0.003, total: 0.033 } },
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getAverageCost();

      // Assert
      expect(result.llm).toBe(0.02);
      expect(result.embedding).toBe(0.002);
      expect(result.total).toBeCloseTo(0.022, 6);
    });

    it('should handle logs with only LLM costs', async () => {
      // Arrange
      const logs = [
        createMockLog({
          metrics: { costs: { llm: 0.01, total: 0.01 } },
        }),
        createMockLog({
          metrics: { costs: { llm: 0.02, total: 0.02 } },
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getAverageCost();

      // Assert
      expect(result.llm).toBe(0.015);
      expect(result.embedding).toBe(0);
      expect(result.total).toBe(0.015);
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

  describe('getCostBreakdownStats', () => {
    it('should compute full statistics breakdown', async () => {
      // Arrange
      const logs = [
        createMockLog({
          metrics: { costs: { llm: 0.01, embedding: 0.001, total: 0.011 } },
        }),
        createMockLog({
          metrics: { costs: { llm: 0.02, embedding: 0.002, total: 0.022 } },
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getCostBreakdownStats();

      // Assert
      expect(result.llm).toEqual({
        count: 2,
        sum: 0.03,
        average: 0.015,
        min: 0.01,
        max: 0.02,
      });
      expect(result.embedding).toEqual({
        count: 2,
        sum: 0.003,
        average: 0.0015,
        min: 0.001,
        max: 0.002,
      });
      expect(result.total).toEqual({
        count: 2,
        sum: 0.033,
        average: 0.0165,
        min: 0.011,
        max: 0.022,
      });
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
      await service.getCostBreakdownStats({ status: ['FAILED', 'TIMEOUT'] });

      // Assert
      expect(mockRepository.findManyWithMetrics).toHaveBeenCalledWith({
        status: ['FAILED', 'TIMEOUT'],
        hasMetrics: true,
      });
    });
  });

  describe('getPerRunCosts', () => {
    it('should return per-run summaries', async () => {
      // Arrange
      const logs = [
        createMockLog({
          id: 'log-1' as Identifier,
          question: 'Question 1',
          metrics: {
            costs: { llm: 0.01, embedding: 0.001, total: 0.011 },
            totalDuration: 60000,
          },
        }),
        createMockLog({
          id: 'log-2' as Identifier,
          question: 'Question 2',
          metrics: {
            costs: { llm: 0.02, embedding: 0.002, total: 0.022 },
            totalDuration: 120000,
          },
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getPerRunCosts();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        logId: 'log-1',
        question: 'Question 1',
        status: 'COMPLETED',
        completedAt: logs[0].completedAt!,
        costs: { llm: 0.01, embedding: 0.001, total: 0.011 },
        duration: 60000,
      });
    });

    it('should filter out logs without costs', async () => {
      // Arrange
      const logs = [
        createMockLog({
          id: 'log-1' as Identifier,
          metrics: { costs: { llm: 0.01, embedding: 0.001, total: 0.011 } },
        }),
        createMockLog({
          id: 'log-2' as Identifier,
          metrics: undefined,
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getPerRunCosts();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].logId).toBe('log-1');
    });

    it('should use completedAt when available, fallback to startedAt', async () => {
      // Arrange
      const logs = [
        createMockLog({
          id: 'log-1' as Identifier,
          completedAt: undefined,
          startedAt: new Date('2024-01-01T10:00:00Z'),
          metrics: { costs: { total: 0.01 } },
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getPerRunCosts();

      // Assert
      expect(result[0].completedAt).toEqual(new Date('2024-01-01T10:00:00Z'));
    });

    it('should respect limit parameter', async () => {
      // Arrange
      mockRepository.findManyWithMetrics.mockResolvedValue([]);

      // Act
      await service.getPerRunCosts(undefined, 50);

      // Assert
      expect(mockRepository.findManyWithMetrics).toHaveBeenCalledWith({
        hasMetrics: true,
        take: 50,
      });
    });
  });

  describe('getTokenBreakdownStats', () => {
    it('should compute token statistics from logs', async () => {
      // Arrange
      const logs = [
        createMockLog({
          metrics: {
            costs: { llm: 0.01, embedding: 0.001, total: 0.011 },
            tokens: { llm: { input: 100, output: 50, total: 150 }, total: 200 },
          },
        }),
        createMockLog({
          metrics: {
            costs: { llm: 0.02, embedding: 0.002, total: 0.022 },
            tokens: {
              llm: { input: 200, output: 100, total: 300 },
              total: 400,
            },
          },
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getTokenBreakdownStats();

      // Assert
      expect(result.llmInput).toEqual({
        count: 2,
        sum: 300,
        average: 150,
        min: 100,
        max: 200,
      });
      expect(result.llmOutput).toEqual({
        count: 2,
        sum: 150,
        average: 75,
        min: 50,
        max: 100,
      });
      expect(result.llmTotal).toEqual({
        count: 2,
        sum: 450,
        average: 225,
        min: 150,
        max: 300,
      });
      expect(result.total).toEqual({
        count: 2,
        sum: 600,
        average: 300,
        min: 200,
        max: 400,
      });
    });

    it('should handle logs with only LLM tokens (no embedding)', async () => {
      // Arrange
      const logs = [
        createMockLog({
          metrics: {
            costs: { total: 0.01 },
            tokens: { llm: { input: 100, output: 50, total: 150 }, total: 150 },
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

  describe('getCombinedAnalytics', () => {
    it('should return both cost and token statistics', async () => {
      // Arrange
      const logs = [
        createMockLog({
          metrics: {
            costs: { llm: 0.01, embedding: 0.001, total: 0.011 },
            tokens: { llm: { input: 100, output: 50, total: 150 }, total: 200 },
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
