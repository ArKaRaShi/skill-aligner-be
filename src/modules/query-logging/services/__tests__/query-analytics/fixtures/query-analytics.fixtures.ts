/**
 * Test fixtures for QueryAnalyticsService tests.
 */
import { mockIds, mockIdWithSuffix } from 'test/fixtures';

import { IQueryLoggingRepository } from 'src/modules/query-logging/contracts/i-query-logging-repository.contract';
import { QueryProcessLog } from 'src/modules/query-logging/types/query-log.type';
import { QueryStatus } from 'src/modules/query-logging/types/query-status.type';

import { QueryAnalyticsService } from '../../../query-analytics.service';

/**
 * Create a mock repository for testing.
 */
export function createMockRepository() {
  return {
    findManyWithMetrics: jest.fn(),
  } as unknown as jest.Mocked<IQueryLoggingRepository>;
}

/**
 * Create the analytics service with a mock repository.
 */
export function createAnalyticsService(
  repository: jest.Mocked<IQueryLoggingRepository>,
) {
  return new QueryAnalyticsService(repository);
}

/**
 * Create a mock query log with default values.
 * Overrides can be provided to customize specific fields.
 *
 * @param overrides - Partial log object to override defaults
 * @returns Mock QueryProcessLog
 *
 * @example
 * const log = createMockLog({ totalCost: 0.01, id: mockIdWithSuffix('log', 2) });
 */
export function createMockLog(
  overrides?: Partial<QueryProcessLog>,
): QueryProcessLog {
  return {
    id: mockIdWithSuffix('log', 1),
    status: 'COMPLETED' as QueryStatus,
    question: 'Test question',
    input: null,
    output: null,
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
      counts: {
        skillsExtracted: 5,
        coursesReturned: 10,
      },
    },
    metadata: null,
    error: null,
    totalCost: 0.0065,
    totalTokens: 160,
    totalDuration: 60000,
    startedAt: new Date('2024-01-01T10:00:00Z'),
    completedAt: new Date('2024-01-01T10:01:00Z'),
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:01:00Z'),
    ...overrides,
  };
}

/**
 * Create mock logs with multiple entries for testing aggregates.
 *
 * @param count - Number of logs to create
 * @param costMultiplier - Multiplier for cost (default: 1)
 * @returns Array of mock logs
 *
 * @example
 * const logs = createMockLogs(3);  // Creates 3 logs with costs 0.0065, 0.013, 0.0195
 */
export function createMockLogs(count: number, costMultiplier: number = 1) {
  const ids = mockIds('log', count);
  const logs: QueryProcessLog[] = [];

  for (let i = 0; i < count; i++) {
    const multiplier = i + 1;
    logs.push(
      createMockLog({
        id: ids[i],
        totalCost: 0.0065 * multiplier * costMultiplier,
        totalTokens: 160 * multiplier,
        metrics: {
          tokenMap: {
            'step1-classification': [
              {
                usage: {
                  model: 'gpt-4',
                  inputTokens: 100 * multiplier,
                  outputTokens: 50 * multiplier,
                },
                costEstimate: {
                  available: true,
                  estimatedCost: 0.0065 * multiplier * costMultiplier,
                  model: 'gpt-4',
                  inputTokens: 100 * multiplier,
                  outputTokens: 50 * multiplier,
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
              end: Date.now() + 60000 * multiplier,
              duration: 60000 * multiplier,
            },
          },
        },
      }),
    );
  }
  return logs;
}
