import { TokenLogger, TokenMap } from 'src/shared/utils/token-logger.helper';

import { PIPELINE_STEPS } from 'src/modules/query-processor/configs/pipeline-steps.config';

/**
 * Test fixtures for TokenMapBreakdownHelper
 *
 * Provides factory functions and test data for testing token breakdown extraction.
 */

/**
 * Creates a mock TokenRecord with specified values.
 *
 * @param inputTokens - Input token count
 * @param outputTokens - Output token count
 * @param estimatedCost - Estimated cost in dollars
 * @returns Mock TokenRecord object
 */
export function createMockTokenRecord(
  inputTokens: number = 100,
  outputTokens: number = 50,
  estimatedCost: number = 0.001,
) {
  return {
    usage: {
      model: 'gpt-4o-mini',
      inputTokens,
      outputTokens,
    },
    costEstimate: {
      model: 'gpt-4o-mini',
      inputTokens,
      outputTokens,
      available: true,
      estimatedCost,
    },
  };
}

/**
 * Creates a mock TokenMap with specified categories.
 *
 * @param categories - Record of category key to array of TokenRecords
 * @returns Mock TokenMap object
 */
export function createMockTokenMap(
  categories: Record<string, ReturnType<typeof createMockTokenRecord>[]> = {},
): TokenMap {
  return categories as unknown as TokenMap;
}

/**
 * Creates a TokenLogger instance from a TokenMap for testing.
 *
 * @param tokenMap - The TokenMap to summarize
 * @returns TokenLogger summary
 */
export function createTokenSummary(tokenMap: Record<string, unknown>) {
  const logger = new TokenLogger();
  return logger.getSummary(tokenMap as Parameters<typeof logger.getSummary>[0]);
}

// ============================================================================
// Test Scenarios
// ============================================================================

/**
 * TokenMap with only LLM steps (no embedding).
 */
export const LLM_ONLY_TOKEN_MAP = createMockTokenMap({
  [PIPELINE_STEPS.CLASSIFICATION.TOKEN_KEY]: [
    createMockTokenRecord(150, 50, 0.0005),
  ],
  [PIPELINE_STEPS.SKILL_EXPANSION.TOKEN_KEY]: [
    createMockTokenRecord(200, 100, 0.001),
  ],
  [PIPELINE_STEPS.RELEVANCE_FILTER.TOKEN_KEY]: [
    createMockTokenRecord(300, 150, 0.002),
  ],
  [PIPELINE_STEPS.ANSWER_SYNTHESIS.TOKEN_KEY]: [
    createMockTokenRecord(400, 200, 0.003),
  ],
});

/**
 * TokenMap with only embedding step.
 */
export const EMBEDDING_ONLY_TOKEN_MAP = createMockTokenMap({
  [PIPELINE_STEPS.COURSE_RETRIEVAL.TOKEN_KEY]: [
    createMockTokenRecord(1536, 0, 0.0002),
  ],
});

/**
 * TokenMap with both LLM and embedding steps (typical scenario).
 */
export const MIXED_TOKEN_MAP = createMockTokenMap({
  [PIPELINE_STEPS.CLASSIFICATION.TOKEN_KEY]: [
    createMockTokenRecord(150, 50, 0.0005),
  ],
  [PIPELINE_STEPS.SKILL_EXPANSION.TOKEN_KEY]: [
    createMockTokenRecord(200, 100, 0.001),
  ],
  [PIPELINE_STEPS.COURSE_RETRIEVAL.TOKEN_KEY]: [
    createMockTokenRecord(1536, 0, 0.0002),
  ],
  [PIPELINE_STEPS.RELEVANCE_FILTER.TOKEN_KEY]: [
    createMockTokenRecord(300, 150, 0.002),
  ],
  [PIPELINE_STEPS.ANSWER_SYNTHESIS.TOKEN_KEY]: [
    createMockTokenRecord(400, 200, 0.003),
  ],
});

/**
 * Empty TokenMap (no categories).
 */
export const EMPTY_TOKEN_MAP = createMockTokenMap({});

/**
 * TokenMap with multiple embedding steps.
 */
export const MULTI_EMBEDDING_TOKEN_MAP = createMockTokenMap({
  [PIPELINE_STEPS.COURSE_RETRIEVAL.TOKEN_KEY]: [
    createMockTokenRecord(1536, 0, 0.0002),
    createMockTokenRecord(1536, 0, 0.0002),
  ],
  [PIPELINE_STEPS.CLASSIFICATION.TOKEN_KEY]: [
    createMockTokenRecord(150, 50, 0.0005),
  ],
});

// ============================================================================
// Expected Results
// ============================================================================

/**
 * Expected breakdown for LLM-only TokenMap.
 */
export const LLM_ONLY_EXPECTED_BREAKDOWN = {
  llmCost: 0.0065,
  embeddingCost: 0,
  llmInput: 1050,
  llmOutput: 500,
  embeddingTokens: 0,
};

/**
 * Expected breakdown for embedding-only TokenMap.
 */
export const EMBEDDING_ONLY_EXPECTED_BREAKDOWN = {
  llmCost: 0,
  embeddingCost: 0.0002,
  llmInput: 0,
  llmOutput: 0,
  embeddingTokens: 1536,
};

/**
 * Expected breakdown for mixed TokenMap (typical scenario).
 */
export const MIXED_EXPECTED_BREAKDOWN = {
  llmCost: 0.0065,
  embeddingCost: 0.0002,
  llmInput: 1050,
  llmOutput: 500,
  embeddingTokens: 1536,
};

/**
 * Expected breakdown for empty TokenMap.
 */
export const EMPTY_EXPECTED_BREAKDOWN = {
  llmCost: 0,
  embeddingCost: 0,
  llmInput: 0,
  llmOutput: 0,
  embeddingTokens: 0,
};
