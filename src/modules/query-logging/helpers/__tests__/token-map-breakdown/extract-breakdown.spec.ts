import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
import { TokenMap } from 'src/shared/utils/token-logger.helper';

import { PIPELINE_STEPS } from 'src/modules/query-processor/configs/pipeline-steps.config';

import { TokenMapBreakdownHelper } from '../../token-map-breakdown.helper';
import {
  createMockTokenRecord,
  EMBEDDING_ONLY_EXPECTED_BREAKDOWN,
  EMBEDDING_ONLY_TOKEN_MAP,
  EMPTY_EXPECTED_BREAKDOWN,
  EMPTY_TOKEN_MAP,
  LLM_ONLY_EXPECTED_BREAKDOWN,
  LLM_ONLY_TOKEN_MAP,
  MIXED_EXPECTED_BREAKDOWN,
  MIXED_TOKEN_MAP,
  MULTI_EMBEDDING_TOKEN_MAP,
} from './fixtures/token-map-breakdown.fixtures';

/**
 * Unit tests for TokenMapBreakdownHelper.extractBreakdown()
 *
 * Tests extraction of LLM vs embedding tokens and costs from TokenMap.
 */
describe('TokenMapBreakdownHelper', () => {
  describe('extractBreakdown', () => {
    describe('when TokenMap contains only LLM steps', () => {
      it('should extract LLM tokens and costs correctly', () => {
        // Arrange
        const tokenMap = LLM_ONLY_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result.llmCost).toBeCloseTo(
          LLM_ONLY_EXPECTED_BREAKDOWN.llmCost,
          DECIMAL_PRECISION.COST,
        );
        expect(result.embeddingCost).toBe(
          LLM_ONLY_EXPECTED_BREAKDOWN.embeddingCost,
        );
        expect(result.llmInput).toBe(LLM_ONLY_EXPECTED_BREAKDOWN.llmInput);
        expect(result.llmOutput).toBe(LLM_ONLY_EXPECTED_BREAKDOWN.llmOutput);
      });

      it('should set embedding tokens to zero', () => {
        // Arrange
        const tokenMap = LLM_ONLY_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result.embeddingTokens).toBe(0);
      });
    });

    describe('when TokenMap contains only embedding step', () => {
      it('should extract embedding tokens and costs correctly', () => {
        // Arrange
        const tokenMap = EMBEDDING_ONLY_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result.embeddingCost).toBeCloseTo(
          EMBEDDING_ONLY_EXPECTED_BREAKDOWN.embeddingCost,
          DECIMAL_PRECISION.COST,
        );
        expect(result.embeddingTokens).toBe(
          EMBEDDING_ONLY_EXPECTED_BREAKDOWN.embeddingTokens,
        );
      });

      it('should set LLM costs and tokens to zero', () => {
        // Arrange
        const tokenMap = EMBEDDING_ONLY_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result.llmCost).toBe(EMBEDDING_ONLY_EXPECTED_BREAKDOWN.llmCost);
        expect(result.llmInput).toBe(
          EMBEDDING_ONLY_EXPECTED_BREAKDOWN.llmInput,
        );
        expect(result.llmOutput).toBe(
          EMBEDDING_ONLY_EXPECTED_BREAKDOWN.llmOutput,
        );
      });
    });

    describe('when TokenMap contains both LLM and embedding steps', () => {
      it('should separate LLM vs embedding costs correctly', () => {
        // Arrange
        const tokenMap = MIXED_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result.llmCost).toBeCloseTo(
          MIXED_EXPECTED_BREAKDOWN.llmCost,
          DECIMAL_PRECISION.COST,
        );
        expect(result.embeddingCost).toBeCloseTo(
          MIXED_EXPECTED_BREAKDOWN.embeddingCost,
          DECIMAL_PRECISION.COST,
        );
      });

      it('should separate LLM vs embedding tokens correctly', () => {
        // Arrange
        const tokenMap = MIXED_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result.llmInput).toBe(MIXED_EXPECTED_BREAKDOWN.llmInput);
        expect(result.llmOutput).toBe(MIXED_EXPECTED_BREAKDOWN.llmOutput);
        expect(result.embeddingTokens).toBe(
          MIXED_EXPECTED_BREAKDOWN.embeddingTokens,
        );
      });

      it('should sum multiple LLM steps correctly', () => {
        // Arrange
        const tokenMap = MIXED_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        // 4 LLM steps: basic-preparation (150+50), skill-inference (200+100), relevance-filter (300+150), synthesis (400+200)
        // Total input: 150+200+300+400 = 1050
        // Total output: 50+100+150+200 = 500
        expect(result.llmInput).toBe(1050);
        expect(result.llmOutput).toBe(500);
      });
    });

    describe('when TokenMap contains multiple embedding steps', () => {
      it('should sum multiple embedding steps', () => {
        // Arrange
        const tokenMap = MULTI_EMBEDDING_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result.embeddingTokens).toBe(3072); // 1536 * 2
        expect(result.embeddingCost).toBeCloseTo(
          0.0004,
          DECIMAL_PRECISION.COST,
        );
      });

      it('should separate LLM costs from embedding costs', () => {
        // Arrange
        const tokenMap = MULTI_EMBEDDING_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result.llmCost).toBeCloseTo(0.0005, DECIMAL_PRECISION.COST); // Only classification step
        expect(result.embeddingCost).toBeCloseTo(
          0.0004,
          DECIMAL_PRECISION.COST,
        );
      });
    });

    describe('when TokenMap is undefined', () => {
      it('should return zeros for all fields', () => {
        // Arrange
        const tokenMap = undefined;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result).toEqual(EMPTY_EXPECTED_BREAKDOWN);
      });

      it('should handle undefined gracefully without errors', () => {
        // Arrange
        const tokenMap = undefined;

        // Act & Assert
        expect(() =>
          TokenMapBreakdownHelper.extractBreakdown(tokenMap),
        ).not.toThrow();
      });
    });

    describe('when TokenMap is null', () => {
      it('should treat null same as undefined', () => {
        // Arrange
        const tokenMap = null as unknown as TokenMap;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result).toEqual(EMPTY_EXPECTED_BREAKDOWN);
      });
    });

    describe('when TokenMap is empty', () => {
      it('should return zeros for empty TokenMap', () => {
        // Arrange
        const tokenMap = EMPTY_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result).toEqual(EMPTY_EXPECTED_BREAKDOWN);
      });
    });

    describe('when TokenMap contains steps with no tokens', () => {
      it('should handle zero token records correctly', () => {
        // Arrange
        const tokenMap = createMockTokenMap({
          [PIPELINE_STEPS.CLASSIFICATION.TOKEN_KEY]: [
            createMockTokenRecord(0, 0, 0),
          ],
        }) as TokenMap;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        expect(result.llmCost).toBe(0);
        expect(result.llmInput).toBe(0);
        expect(result.llmOutput).toBe(0);
      });
    });

    describe('when calculating totals', () => {
      it('should calculate total as sum of all tokens', () => {
        // Arrange
        const tokenMap = MIXED_TOKEN_MAP;

        // Act
        const result = TokenMapBreakdownHelper.extractBreakdown(tokenMap);

        // Assert
        const llmTotal = result.llmInput + result.llmOutput;
        const _expectedTotal = 1050 + 500 + 1536; // LLM + embedding
        expect(llmTotal).toBe(1550);
        expect(result.embeddingTokens).toBe(1536);
      });
    });
  });
});

/**
 * Helper function to create a mock TokenMap for testing.
 */
function createMockTokenMap(
  categories: Record<
    string,
    ReturnType<
      typeof import('./fixtures/token-map-breakdown.fixtures').createMockTokenRecord
    >[]
  >,
): Record<string, unknown> {
  return categories;
}
