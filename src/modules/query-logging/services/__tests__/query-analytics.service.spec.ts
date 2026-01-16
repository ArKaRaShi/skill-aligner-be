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
              available: false,
              estimatedCost: 0,
              model: 'e5-base',
              inputTokens: 10,
              outputTokens: 0,
            },
          },
        ],
      },
      timing: {
        'total-pipeline': {
          start: Date.now(),
          end: Date.now() + 60000,
          duration: 60000,
        },
      },
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
          id: 'log-1' as Identifier,
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
          id: 'log-2' as Identifier,
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
          id: 'log-3' as Identifier,
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

      // Assert
      expect(result.llm).toBeCloseTo(0.013, 3); // (0.0065 + 0.013 + 0.0195) / 3
      expect(result.embedding).toBeCloseTo(0.002, 3); // (0.001 + 0.002 + 0.003) / 3
      expect(result.total).toBeCloseTo(0.015, 2); // (0.0075 + 0.015 + 0.0225) / 3
    });

    it('should handle logs with only LLM costs', async () => {
      // Arrange
      const logs = [
        createMockLog({
          id: 'log-1' as Identifier,
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
          id: 'log-2' as Identifier,
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

      // Assert
      expect(result.llm).toBeCloseTo(0.015, 3);
      expect(result.embedding).toBe(0);
      expect(result.total).toBeCloseTo(0.015, 3);
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
          id: 'log-1' as Identifier,
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
          id: 'log-2' as Identifier,
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

      // Assert
      expect(result.llm.count).toBe(2);
      expect(result.llm.sum).toBeCloseTo(0.03, 3);
      expect(result.llm.average).toBeCloseTo(0.015, 3);
      expect(result.llm.min).toBeCloseTo(0.01, 3);
      expect(result.llm.max).toBeCloseTo(0.02, 3);
      expect(result.embedding.count).toBe(2);
      expect(result.embedding.sum).toBeCloseTo(0.003, 4);
      expect(result.embedding.average).toBeCloseTo(0.0015, 4);
      expect(result.embedding.min).toBeCloseTo(0.001, 4);
      expect(result.embedding.max).toBeCloseTo(0.002, 4);
      expect(result.total.count).toBe(2);
      expect(result.total.sum).toBeCloseTo(0.033, 3);
      expect(result.total.average).toBeCloseTo(0.0165, 4);
      expect(result.total.min).toBeCloseTo(0.011, 4);
      expect(result.total.max).toBeCloseTo(0.022, 4);
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
            timing: {
              'total-pipeline': {
                start: Date.now(),
                end: Date.now() + 60000,
                duration: 60000,
              },
            },
          },
        }),
        createMockLog({
          id: 'log-2' as Identifier,
          question: 'Question 2',
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
            timing: {
              'total-pipeline': {
                start: Date.now(),
                end: Date.now() + 120000,
                duration: 120000,
              },
            },
          },
        }),
      ];
      mockRepository.findManyWithMetrics.mockResolvedValue(logs);

      // Act
      const result = await service.getPerRunCosts();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        logId: 'log-1',
        question: 'Question 1',
        status: 'COMPLETED',
        costs: { llm: 0.01, embedding: 0.001, total: 0.011 },
        duration: 60000,
      });
    });

    it('should filter out logs without costs', async () => {
      // Arrange
      const logs = [
        createMockLog({
          id: 'log-1' as Identifier,
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
          id: 'log-1' as Identifier,
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
          id: 'log-2' as Identifier,
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
          id: 'log-1' as Identifier,
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

  describe('getCombinedAnalytics', () => {
    it('should return both cost and token statistics', async () => {
      // Arrange
      const logs = [
        createMockLog({
          id: 'log-1' as Identifier,
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
