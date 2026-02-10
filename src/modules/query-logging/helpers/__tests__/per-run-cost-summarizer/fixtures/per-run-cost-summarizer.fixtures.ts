import { Identifier } from 'src/shared/contracts/types/identifier';
import { TokenMap } from 'src/shared/utils/token-logger.helper';

import type { PerRunCostSummary } from 'src/modules/query-logging/types/query-analytics.type';
import type { QueryProcessLog } from 'src/modules/query-logging/types/query-log.type';
import { QUERY_STATUS } from 'src/modules/query-logging/types/query-status.type';

/**
 * Test fixtures for PerRunCostSummarizerHelper
 *
 * Provides factory functions and test data for testing QueryProcessLog to PerRunCostSummary transformation.
 */

/**
 * Creates a mock QueryProcessLog with specified values.
 *
 * @param overrides - Partial QueryProcessLog to override default values
 * @returns Mock QueryProcessLog object
 */
export function createMockQueryProcessLog(
  overrides: Partial<QueryProcessLog> = {},
): QueryProcessLog {
  const now = new Date();
  return {
    id: 'log-001' as Identifier,
    status: QUERY_STATUS.COMPLETED,
    question: 'What courses teach Python programming?',
    input: null,
    output: null,
    metrics: null,
    metadata: null,
    error: null,
    totalDuration: 5000,
    totalTokens: 1000,
    totalCost: 0.01,
    startedAt: now,
    completedAt: new Date(now.getTime() + 5000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a mock TokenMap for testing.
 *
 * @param overrides - Partial TokenMap to override default values
 * @returns Mock TokenMap object
 */
export function createMockTokenMapForLog(
  overrides: Partial<TokenMap> = {},
): TokenMap {
  const defaultTokenMap: TokenMap = {
    'step1-question-classification': [
      {
        usage: {
          model: 'gpt-4o-mini',
          inputTokens: 150,
          outputTokens: 50,
        },
        costEstimate: {
          model: 'gpt-4o-mini',
          inputTokens: 150,
          outputTokens: 50,
          available: true,
          estimatedCost: 0.0005,
        },
      },
    ],
    'step3-course-retrieval': [
      {
        usage: {
          model: 'text-embedding-3-small',
          inputTokens: 1536,
          outputTokens: 0,
        },
        costEstimate: {
          model: 'text-embedding-3-small',
          inputTokens: 1536,
          outputTokens: 0,
          available: true,
          estimatedCost: 0.0002,
        },
      },
    ],
  };

  return { ...defaultTokenMap, ...overrides } as TokenMap;
}

// ============================================================================
// Test Scenarios
// ============================================================================

/**
 * Complete QueryProcessLog with all fields populated.
 */
export const COMPLETE_LOG: QueryProcessLog = createMockQueryProcessLog({
  id: 'log-complete' as Identifier,
  status: QUERY_STATUS.COMPLETED,
  question: 'What courses teach machine learning?',
  totalDuration: 7500,
  totalTokens: 2586,
  totalCost: 0.0072,
  metrics: {
    tokenMap: createMockTokenMapForLog(),
  },
});

/**
 * QueryProcessLog without totalCost (should be filtered out in toSummaryArray).
 */
export const LOG_WITHOUT_COST: QueryProcessLog = createMockQueryProcessLog({
  id: 'log-no-cost' as Identifier,
  totalCost: null,
});

/**
 * QueryProcessLog with null completedAt (should fall back to startedAt).
 */
export const LOG_WITHOUT_COMPLETED_AT: QueryProcessLog =
  createMockQueryProcessLog({
    id: 'log-no-completed' as Identifier,
    completedAt: null,
  });

/**
 * QueryProcessLog with failed status.
 */
export const FAILED_LOG: QueryProcessLog = createMockQueryProcessLog({
  id: 'log-failed' as Identifier,
  status: QUERY_STATUS.FAILED,
  question: 'Invalid query',
  error: {
    message: 'Query processing failed',
  },
});

/**
 * QueryProcessLog with only LLM costs (no embedding).
 */
export const LLM_ONLY_LOG: QueryProcessLog = createMockQueryProcessLog({
  id: 'log-llm-only' as Identifier,
  totalCost: 0.0065,
  totalTokens: 1550,
  metrics: {
    tokenMap: createMockTokenMapForLog({
      'step3-course-retrieval': [], // Empty embedding step
    }),
  },
});

/**
 * QueryProcessLog with only embedding costs (no LLM).
 */
export const EMBEDDING_ONLY_LOG: QueryProcessLog = createMockQueryProcessLog({
  id: 'log-embedding-only' as Identifier,
  totalCost: 0.0002,
  totalTokens: 1536,
  metrics: {
    tokenMap: createMockTokenMapForLog({
      'step1-question-classification': [], // Empty LLM step
    }),
  },
});

/**
 * Array of mixed logs for testing toSummaryArray.
 */
export const MIXED_LOGS: QueryProcessLog[] = [
  COMPLETE_LOG,
  LOG_WITHOUT_COST,
  FAILED_LOG,
  LLM_ONLY_LOG,
];

// ============================================================================
// Expected Results
// ============================================================================

/**
 * Expected PerRunCostSummary for COMPLETE_LOG.
 */
export const COMPLETE_SUMMARY: PerRunCostSummary = {
  logId: 'log-complete' as Identifier,
  question: 'What courses teach machine learning?',
  status: QUERY_STATUS.COMPLETED,
  completedAt: COMPLETE_LOG.completedAt ?? COMPLETE_LOG.startedAt,
  costs: {
    llm: 0.0005,
    embedding: 0.0002,
    total: 0.0072,
  },
  tokens: {
    llm: {
      input: 150,
      output: 50,
      total: 200,
    },
    embedding: { total: 1536 },
    total: 2586,
  },
  duration: 7500,
};

/**
 * Expected PerRunCostSummary for LLM_ONLY_LOG.
 */
export const LLM_ONLY_SUMMARY: PerRunCostSummary = {
  logId: 'log-llm-only' as Identifier,
  question: LLM_ONLY_LOG.question,
  status: LLM_ONLY_LOG.status,
  completedAt: LLM_ONLY_LOG.completedAt ?? LLM_ONLY_LOG.startedAt,
  costs: {
    llm: 0.0005,
    embedding: undefined, // No embedding cost
    total: 0.0065,
  },
  tokens: {
    llm: {
      input: 150,
      output: 50,
      total: 200,
    },
    embedding: { total: 0 },
    total: 1550,
  },
  duration: LLM_ONLY_LOG.totalDuration ?? undefined,
};

/**
 * Expected PerRunCostSummary for EMBEDDING_ONLY_LOG.
 */
export const EMBEDDING_ONLY_SUMMARY: PerRunCostSummary = {
  logId: 'log-embedding-only' as Identifier,
  question: EMBEDDING_ONLY_LOG.question,
  status: EMBEDDING_ONLY_LOG.status,
  completedAt: EMBEDDING_ONLY_LOG.completedAt ?? EMBEDDING_ONLY_LOG.startedAt,
  costs: {
    llm: undefined, // No LLM cost
    embedding: 0.0002,
    total: 0.0002,
  },
  tokens: {
    llm: {
      input: 0,
      output: 0,
      total: 0,
    },
    embedding: { total: 1536 },
    total: 1536,
  },
  duration: EMBEDDING_ONLY_LOG.totalDuration ?? undefined,
};

/**
 * Expected result for toSummaryArray (filters out logs without totalCost).
 */
export const FILTERED_SUMMARIES: PerRunCostSummary[] = [
  COMPLETE_SUMMARY,
  // LOG_WITHOUT_COST is filtered out (no totalCost)
  FAILED_LOG.totalCost !== null
    ? {
        logId: FAILED_LOG.id,
        question: FAILED_LOG.question,
        status: FAILED_LOG.status,
        completedAt: FAILED_LOG.completedAt ?? FAILED_LOG.startedAt,
        costs: {
          llm: undefined,
          embedding: undefined,
          total: FAILED_LOG.totalCost,
        },
        tokens: {
          llm: { input: 0, output: 0, total: 0 },
          embedding: { total: 0 },
          total: FAILED_LOG.totalTokens ?? 0,
        },
        duration: FAILED_LOG.totalDuration ?? undefined,
      }
    : undefined,
  LLM_ONLY_SUMMARY,
].filter(Boolean) as PerRunCostSummary[];
