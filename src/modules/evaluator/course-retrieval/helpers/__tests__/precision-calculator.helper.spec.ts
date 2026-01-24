import { describe, expect, it } from '@jest/globals';

import { PrecisionCalculator } from '../precision-calculator.helper';

describe('PrecisionCalculator', () => {
  describe('calculatePrecisionAtK', () => {
    it('should calculate precision correctly', () => {
      const scores = [3, 2, 1, 0, 2];
      // Relevant (≥2): positions 0, 1, 4 → 3 out of 5
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 5);
      expect(result).toBe(0.6); // 3/5 = 0.6
    });

    it('should handle k=5 with mixed relevance', () => {
      const scores = [3, 3, 2, 1, 0];
      // Relevant (≥2): 3 out of 5
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 5);
      expect(result).toBe(0.6);
    });

    it('should handle k=10 with fewer than 10 scores', () => {
      const scores = [3, 2, 1];
      // Relevant: 2 out of 3 (k is capped by array length)
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 10);
      expect(result).toBeCloseTo(0.667, 3); // 2/3
    });

    it('should handle all relevant courses', () => {
      const scores = [3, 3, 2, 2];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 4);
      expect(result).toBe(1.0); // 4/4 = 1.0
    });

    it('should handle all irrelevant courses', () => {
      const scores = [0, 1, 0, 1];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 4);
      expect(result).toBe(0); // 0/4 = 0
    });

    it('should handle empty array', () => {
      const result = PrecisionCalculator.calculatePrecisionAtK([], 5);
      expect(result).toBe(0);
    });

    it('should handle k=0', () => {
      const scores = [3, 2, 1];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 0);
      expect(result).toBe(0);
    });

    it('should handle negative k', () => {
      const scores = [3, 2, 1];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, -5);
      expect(result).toBe(0);
    });

    it('should use default threshold of 2', () => {
      const scores = [3, 2, 1, 0];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 4);
      expect(result).toBe(0.5); // 2 relevant (3, 2) out of 4
    });

    it('should accept custom threshold', () => {
      const scores = [3, 2, 1, 0];
      // Threshold 3: only score 3 is relevant
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 4, 3);
      expect(result).toBe(0.25); // 1 relevant (3) out of 4
    });

    it('should handle threshold of 0 (all relevant)', () => {
      const scores = [0, 1, 2, 3];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 4, 0);
      expect(result).toBe(1.0); // All 4 are relevant
    });

    it('should handle threshold of 1', () => {
      const scores = [0, 1, 2, 3];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 4, 1);
      expect(result).toBe(0.75); // 3 relevant (1, 2, 3) out of 4
    });

    it('should calculate precision@5 correctly', () => {
      const scores = [3, 2, 2, 1, 0, 2, 1, 0];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 5);
      // Top 5: [3, 2, 2, 1, 0] → 3 relevant (3, 2, 2)
      expect(result).toBe(0.6); // 3/5
    });

    it('should calculate precision@10 correctly', () => {
      const scores = [3, 3, 2, 2, 2, 1, 1, 0, 0, 2];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 10);
      // All 10: 6 relevant (3, 3, 2, 2, 2, 2)
      expect(result).toBe(0.6); // 6/10
    });

    it('should handle single relevant course', () => {
      const scores = [2, 0, 0, 0, 0];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 5);
      expect(result).toBe(0.2); // 1/5
    });

    it('should handle single course', () => {
      const scores = [2];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 1);
      expect(result).toBe(1.0); // 1/1
    });

    it('should handle single irrelevant course', () => {
      const scores = [0];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 1);
      expect(result).toBe(0); // 0/1
    });
  });

  describe('calculatePrecisionAtMultipleK', () => {
    it('should calculate precision at multiple K values', () => {
      const scores = [3, 2, 2, 1, 0, 2, 1, 0];
      const results = PrecisionCalculator.calculatePrecisionAtMultipleK(
        scores,
        [5, 10],
      );

      expect(results.size).toBe(2);
      expect(results.has(5)).toBe(true);
      expect(results.has(10)).toBe(true);

      // Precision@5: [3, 2, 2, 1, 0] → 3 relevant
      expect(results.get(5)).toBe(0.6);

      // Precision@10: 8 scores available (k > array length)
      // TREC standard: divide by actual items, not k
      // 4 relevant out of 8 actual = 0.5
      expect(results.get(10)).toBe(0.5); // 4/8 (TREC standard)
    });

    it('should handle empty kValues array', () => {
      const scores = [3, 2, 1];
      const results = PrecisionCalculator.calculatePrecisionAtMultipleK(
        scores,
        [],
      );
      expect(results.size).toBe(0);
    });

    it('should use default threshold', () => {
      const scores = [3, 2, 1, 0];
      const results = PrecisionCalculator.calculatePrecisionAtMultipleK(
        scores,
        [2, 4],
      );

      // Threshold 2: scores ≥ 2 are relevant
      expect(results.get(2)).toBe(1.0); // [3, 2] → 2/2
      expect(results.get(4)).toBe(0.5); // [3, 2, 1, 0] → 2/4
    });

    it('should accept custom threshold', () => {
      const scores = [3, 2, 1, 0];
      const results = PrecisionCalculator.calculatePrecisionAtMultipleK(
        scores,
        [4],
        3,
      );

      // Threshold 3: only score 3 is relevant
      expect(results.get(4)).toBe(0.25); // 1/4
    });

    it('should handle k larger than array length', () => {
      const scores = [3, 2];
      const results = PrecisionCalculator.calculatePrecisionAtMultipleK(
        scores,
        [5, 10],
      );

      // Should calculate based on available scores
      expect(results.get(5)).toBe(1.0); // 2/2 = 1.0 (all available are relevant)
      expect(results.get(10)).toBe(1.0); // Same
    });
  });

  describe('realistic scenarios', () => {
    it('should handle excellent retrieval', () => {
      // Most top courses are relevant
      const scores = [3, 3, 3, 2, 2, 1, 0, 0];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 5);
      expect(result).toBeGreaterThan(0.8); // At least 80% precision
    });

    it('should handle poor retrieval', () => {
      // Few top courses are relevant
      const scores = [0, 1, 0, 2, 1, 3, 2, 2];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 5);
      expect(result).toBeLessThan(0.4); // Less than 40% precision
    });

    it('should handle fair retrieval', () => {
      // Mixed relevance
      const scores = [3, 2, 1, 0, 2, 1, 3, 0];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 10);
      expect(result).toBeGreaterThan(0.3);
      expect(result).toBeLessThan(0.7);
    });

    it('should handle edge case: exactly threshold value', () => {
      // Score exactly at threshold
      const scores = [2, 2, 2, 2];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 4);
      expect(result).toBe(1.0); // All are relevant (≥2)
    });

    it('should handle edge case: just below threshold', () => {
      // Score just below threshold
      const scores = [1, 1, 1, 1];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 4);
      expect(result).toBe(0); // None are relevant (<2)
    });
  });

  describe('boundary conditions', () => {
    it('should handle very large k', () => {
      const scores = [3, 2, 1];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 1000);
      expect(result).toBeCloseTo(0.667, 3); // 2/3
    });

    it('should handle all scores as 2 (threshold)', () => {
      const scores = [2, 2, 2, 2, 2];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 5);
      expect(result).toBe(1.0);
    });

    it('should handle all scores as 1 (below threshold)', () => {
      const scores = [1, 1, 1, 1, 1];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 5);
      expect(result).toBe(0);
    });

    it('should handle alternating scores', () => {
      const scores = [3, 0, 3, 0, 3];
      const result = PrecisionCalculator.calculatePrecisionAtK(scores, 5);
      expect(result).toBe(0.6); // 3/5
    });
  });
});
