import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';

import { PerRunCostSummarizerHelper } from '../../per-run-cost-summarizer.helper';
import {
  COMPLETE_LOG,
  COMPLETE_SUMMARY,
  EMBEDDING_ONLY_LOG,
  EMBEDDING_ONLY_SUMMARY,
  FAILED_LOG,
  LLM_ONLY_LOG,
  LLM_ONLY_SUMMARY,
  LOG_WITHOUT_COMPLETED_AT,
  LOG_WITHOUT_COST,
  MIXED_LOGS,
} from './fixtures/per-run-cost-summarizer.fixtures';

describe('PerRunCostSummarizerHelper', () => {
  describe('toSummary', () => {
    describe('when transforming a complete log', () => {
      it('should extract basic fields correctly', () => {
        // Arrange
        const log = COMPLETE_LOG;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.logId).toBe(COMPLETE_SUMMARY.logId);
        expect(result.question).toBe(COMPLETE_SUMMARY.question);
        expect(result.status).toBe(COMPLETE_SUMMARY.status);
      });

      it('should use completedAt if available', () => {
        // Arrange
        const log = COMPLETE_LOG;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.completedAt).toEqual(COMPLETE_SUMMARY.completedAt);
      });

      it('should fall back to startedAt if completedAt is null', () => {
        // Arrange
        const log = LOG_WITHOUT_COMPLETED_AT;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.completedAt).toEqual(log.startedAt);
      });

      it('should extract LLM and embedding costs from TokenMap', () => {
        // Arrange
        const log = COMPLETE_LOG;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.costs.llm).toBeCloseTo(
          COMPLETE_SUMMARY.costs.llm ?? 0,
          DECIMAL_PRECISION.COST,
        );
        expect(result.costs.embedding).toBeCloseTo(
          COMPLETE_SUMMARY.costs.embedding ?? 0,
          DECIMAL_PRECISION.COST,
        );
        expect(result.costs.total).toBeCloseTo(
          COMPLETE_SUMMARY.costs.total,
          DECIMAL_PRECISION.COST,
        );
      });

      it('should extract LLM and embedding tokens from TokenMap', () => {
        // Arrange
        const log = COMPLETE_LOG;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.tokens).toBeDefined();
        expect(result.tokens!.llm).toBeDefined();
        expect(result.tokens!.embedding).toBeDefined();
        expect(result.tokens!.llm!.input).toBe(
          COMPLETE_SUMMARY.tokens!.llm!.input,
        );
        expect(result.tokens!.llm!.output).toBe(
          COMPLETE_SUMMARY.tokens!.llm!.output,
        );
        expect(result.tokens!.llm!.total).toBe(
          COMPLETE_SUMMARY.tokens!.llm!.total,
        );
        expect(result.tokens!.embedding!.total).toBe(
          COMPLETE_SUMMARY.tokens!.embedding!.total,
        );
      });

      it('should include duration if available', () => {
        // Arrange
        const log = COMPLETE_LOG;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.duration).toBe(COMPLETE_SUMMARY.duration);
      });
    });

    describe('when TokenMap has only LLM steps', () => {
      it('should set embedding cost to undefined', () => {
        // Arrange
        const log = LLM_ONLY_LOG;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.costs.embedding).toBeUndefined();
        expect(result.costs.llm).toBeCloseTo(
          LLM_ONLY_SUMMARY.costs.llm ?? 0,
          DECIMAL_PRECISION.COST,
        );
      });

      it('should set embedding tokens to zero', () => {
        // Arrange
        const log = LLM_ONLY_LOG;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.tokens!.embedding!.total).toBe(0);
        expect(result.tokens!.llm!.total).toBe(
          LLM_ONLY_SUMMARY.tokens!.llm!.total,
        );
      });
    });

    describe('when TokenMap has only embedding steps', () => {
      it('should set LLM cost to undefined', () => {
        // Arrange
        const log = EMBEDDING_ONLY_LOG;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.costs.llm).toBeUndefined();
        expect(result.costs.embedding).toBeCloseTo(
          EMBEDDING_ONLY_SUMMARY.costs.embedding ?? 0,
          DECIMAL_PRECISION.COST,
        );
      });

      it('should set LLM tokens to zero', () => {
        // Arrange
        const log = EMBEDDING_ONLY_LOG;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.tokens!.llm!.input).toBe(0);
        expect(result.tokens!.llm!.output).toBe(0);
        expect(result.tokens!.llm!.total).toBe(0);
        expect(result.tokens!.embedding!.total).toBe(
          EMBEDDING_ONLY_SUMMARY.tokens!.embedding!.total,
        );
      });
    });

    describe('when log has no TokenMap', () => {
      it('should set all costs to zero or undefined', () => {
        // Arrange
        const log = { ...COMPLETE_LOG, metrics: null };

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.costs.llm).toBeUndefined();
        expect(result.costs.embedding).toBeUndefined();
        expect(result.costs.total).toBe(log.totalCost!);
      });

      it('should set all tokens to zero', () => {
        // Arrange
        const log = { ...COMPLETE_LOG, metrics: null };

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.tokens!.llm!.input).toBe(0);
        expect(result.tokens!.llm!.output).toBe(0);
        expect(result.tokens!.llm!.total).toBe(0);
        expect(result.tokens!.embedding!.total).toBe(0);
      });
    });

    describe('when log has no duration', () => {
      it('should set duration to undefined', () => {
        // Arrange
        const log = { ...COMPLETE_LOG, totalDuration: null };

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        expect(result.duration).toBeUndefined();
      });
    });

    describe('when calculating LLM token totals', () => {
      it('should calculate total as input + output', () => {
        // Arrange
        const log = COMPLETE_LOG;

        // Act
        const result = PerRunCostSummarizerHelper.toSummary(log);

        // Assert
        const expectedTotal =
          result.tokens!.llm!.input + result.tokens!.llm!.output;
        expect(result.tokens!.llm!.total).toBe(expectedTotal);
      });
    });
  });

  describe('toSummaryArray', () => {
    describe('when filtering logs', () => {
      it('should include logs with totalCost', () => {
        // Arrange
        const logs = [COMPLETE_LOG, LOG_WITHOUT_COST, FAILED_LOG];

        // Act
        const result = PerRunCostSummarizerHelper.toSummaryArray(logs);

        // Assert
        expect(result).toHaveLength(2); // COMPLETE_LOG and FAILED_LOG have totalCost
        expect(result.some((r) => r.logId === COMPLETE_LOG.id)).toBe(true);
        expect(result.some((r) => r.logId === FAILED_LOG.id)).toBe(true);
      });

      it('should exclude logs without totalCost', () => {
        // Arrange
        const logs = [COMPLETE_LOG, LOG_WITHOUT_COST];

        // Act
        const result = PerRunCostSummarizerHelper.toSummaryArray(logs);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].logId).toBe(COMPLETE_LOG.id);
        expect(result.some((r) => r.logId === LOG_WITHOUT_COST.id)).toBe(false);
      });

      it('should return empty array when all logs have no totalCost', () => {
        // Arrange
        const logs = [LOG_WITHOUT_COST, { ...LOG_WITHOUT_COST }];

        // Act
        const result = PerRunCostSummarizerHelper.toSummaryArray(logs);

        // Assert
        expect(result).toHaveLength(0);
      });
    });

    describe('when transforming multiple logs', () => {
      it('should transform all logs with totalCost', () => {
        // Arrange
        const logs = [COMPLETE_LOG, FAILED_LOG, LLM_ONLY_LOG];

        // Act
        const result = PerRunCostSummarizerHelper.toSummaryArray(logs);

        // Assert
        expect(result).toHaveLength(3);
        expect(result[0].logId).toBe(COMPLETE_LOG.id);
        expect(result[1].logId).toBe(FAILED_LOG.id);
        expect(result[2].logId).toBe(LLM_ONLY_LOG.id);
      });

      it('should preserve order of logs', () => {
        // Arrange
        const logs = [FAILED_LOG, COMPLETE_LOG, LLM_ONLY_LOG];

        // Act
        const result = PerRunCostSummarizerHelper.toSummaryArray(logs);

        // Assert
        expect(result[0].logId).toBe(FAILED_LOG.id);
        expect(result[1].logId).toBe(COMPLETE_LOG.id);
        expect(result[2].logId).toBe(LLM_ONLY_LOG.id);
      });
    });

    describe('when transforming individual logs', () => {
      it('should call toSummary for each log', () => {
        // Arrange
        const logs = MIXED_LOGS;

        // Act
        const result = PerRunCostSummarizerHelper.toSummaryArray(logs);

        // Assert
        // COMPLETE_LOG should be transformed correctly
        const completeSummary = result.find((r) => r.logId === COMPLETE_LOG.id);
        expect(completeSummary).toBeDefined();
        expect(completeSummary?.costs.total).toBeCloseTo(
          COMPLETE_SUMMARY.costs.total,
          6,
        );

        // LLM_ONLY_LOG should be transformed correctly
        const llmOnlySummary = result.find((r) => r.logId === LLM_ONLY_LOG.id);
        expect(llmOnlySummary).toBeDefined();
        expect(llmOnlySummary?.costs.llm).toBeCloseTo(
          LLM_ONLY_SUMMARY.costs.llm ?? 0,
          6,
        );
      });
    });

    describe('edge cases', () => {
      it('should handle empty array', () => {
        // Arrange
        const logs: any[] = [];

        // Act
        const result = PerRunCostSummarizerHelper.toSummaryArray(logs);

        // Assert
        expect(result).toHaveLength(0);
      });

      it('should handle array with single log', () => {
        // Arrange
        const logs = [COMPLETE_LOG];

        // Act
        const result = PerRunCostSummarizerHelper.toSummaryArray(logs);

        // Assert
        expect(result).toHaveLength(1);
        expect(result[0].logId).toBe(COMPLETE_LOG.id);
      });

      it('should handle array with only logs without totalCost', () => {
        // Arrange
        const logs = [LOG_WITHOUT_COST, { ...LOG_WITHOUT_COST }];

        // Act
        const result = PerRunCostSummarizerHelper.toSummaryArray(logs);

        // Assert
        expect(result).toHaveLength(0);
      });
    });
  });
});
