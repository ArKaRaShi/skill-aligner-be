import {
  createAnalyticsService,
  createMockLog,
  createMockRepository,
} from '../fixtures/query-analytics.fixtures';

/**
 * Unit tests for QueryAnalyticsService.getPerRunCosts()
 *
 * Tests per-query cost breakdown with LLM vs embedding split.
 */
describe('QueryAnalyticsService - getPerRunCosts', () => {
  let mockRepository: ReturnType<typeof createMockRepository>;
  let service: ReturnType<typeof createAnalyticsService>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    service = createAnalyticsService(mockRepository);
  });

  it('should return per-run summaries', async () => {
    // Arrange
    const logs = [
      createMockLog({
        id: 'log-1' as any,
        question: 'Question 1',
        totalCost: 0.011,
        totalTokens: 160,
        totalDuration: 60000,
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
        id: 'log-2' as any,
        question: 'Question 2',
        totalCost: 0.022,
        totalTokens: 320,
        totalDuration: 120000,
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
      createMockLog({
        id: 'log-2' as any,
        metrics: undefined,
        totalCost: undefined,
        totalTokens: undefined,
        totalDuration: undefined,
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
        id: 'log-1' as any,
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
