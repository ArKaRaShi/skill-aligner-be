import { describe, expect, it } from '@jest/globals';

import { NdcgCalculator } from '../ndcg-calculator.helper';

describe('NdcgCalculator', () => {
  describe('calculateDCG', () => {
    it('should calculate DCG correctly', () => {
      const scores = [3, 2, 1, 0];
      // DCG = 3/log2(2) + 2/log2(3) + 1/log2(4) + 0/log2(5)
      //     = 3/1 + 2/1.585 + 1/2 + 0
      //     ≈ 3 + 1.262 + 0.5 + 0
      //     ≈ 4.762
      const result = NdcgCalculator.calculateDCG(scores);
      expect(result).toBeCloseTo(4.762, 3);
    });

    it('should handle empty array', () => {
      const result = NdcgCalculator.calculateDCG([]);
      expect(result).toBe(0);
    });

    it('should respect k parameter', () => {
      const scores = [3, 2, 1, 0];
      const result = NdcgCalculator.calculateDCG(scores, 2);
      // DCG@2 = 3/log2(2) + 2/log2(3)
      //       ≈ 3 + 1.262
      //       ≈ 4.262
      expect(result).toBeCloseTo(4.262, 3);
    });

    it('should handle single score', () => {
      const result = NdcgCalculator.calculateDCG([2]);
      // DCG = 2/log2(2) = 2/1 = 2
      expect(result).toBeCloseTo(2, 3);
    });

    it('should handle all zero scores', () => {
      const result = NdcgCalculator.calculateDCG([0, 0, 0]);
      expect(result).toBe(0);
    });

    it('should handle all maximum scores', () => {
      const result = NdcgCalculator.calculateDCG([3, 3, 3]);
      // DCG = 3/log2(2) + 3/log2(3) + 3/log2(4)
      //     ≈ 3 + 1.893 + 1.5
      //     ≈ 6.393
      expect(result).toBeCloseTo(6.393, 3);
    });
  });

  describe('calculateIDCG', () => {
    it('should calculate IDCG by sorting scores descending', () => {
      const scores = [1, 3, 0, 2];
      // Sorted: [3, 2, 1, 0]
      // IDCG = 3/log2(2) + 2/log2(3) + 1/log2(4) + 0/log2(5)
      //      ≈ 3 + 1.262 + 0.5 + 0
      //      ≈ 4.762
      const result = NdcgCalculator.calculateIDCG(scores);
      expect(result).toBeCloseTo(4.762, 3);
    });

    it('should handle empty array', () => {
      const result = NdcgCalculator.calculateIDCG([]);
      expect(result).toBe(0);
    });

    it('should respect k parameter', () => {
      const scores = [1, 3, 0, 2];
      const result = NdcgCalculator.calculateIDCG(scores, 2);
      // IDCG@2 = 3/log2(2) + 2/log2(3)
      //        ≈ 3 + 1.262
      //        ≈ 4.262
      expect(result).toBeCloseTo(4.262, 3);
    });

    it('should return same DCG when already sorted', () => {
      const scores = [3, 2, 1, 0];
      const dcg = NdcgCalculator.calculateDCG(scores);
      const idcg = NdcgCalculator.calculateIDCG(scores);
      expect(dcg).toBeCloseTo(idcg, 5);
    });
  });

  describe('calculateNDCG', () => {
    it('should return 1 for perfect ranking', () => {
      const scores = [3, 2, 1, 0]; // Already sorted descending
      const result = NdcgCalculator.calculateNDCG(scores);
      expect(result).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for all zero scores', () => {
      const result = NdcgCalculator.calculateNDCG([0, 0, 0]);
      expect(result).toBe(0);
    });

    it('should calculate NDCG correctly for imperfect ranking', () => {
      const scores = [0, 1, 2, 3]; // Reverse sorted (worst ranking)
      // DCG = 0/log2(2) + 1/log2(3) + 2/log2(4) + 3/log2(5)
      //     ≈ 0 + 0.631 + 1 + 1.292
      //     ≈ 2.923
      // IDCG ≈ 4.762 (from earlier)
      // NDCG ≈ 2.923 / 4.762 ≈ 0.614
      const result = NdcgCalculator.calculateNDCG(scores);
      expect(result).toBeCloseTo(0.614, 3);
    });

    it('should handle k parameter', () => {
      const scores = [1, 3, 0, 2];
      const result = NdcgCalculator.calculateNDCG(scores, 2);
      // DCG@2 = 1/log2(2) + 3/log2(3) ≈ 1 + 1.893 = 2.893
      // IDCG@2 = 3/log2(2) + 2/log2(3) ≈ 3 + 1.262 = 4.262
      // NDCG@2 ≈ 2.893 / 4.262 ≈ 0.679
      expect(result).toBeCloseTo(0.679, 3);
    });

    it('should handle single element', () => {
      const result = NdcgCalculator.calculateNDCG([2]);
      expect(result).toBeCloseTo(1.0, 5); // Single element is always "perfect"
    });

    it('should handle relevance score 2 at position 1', () => {
      const scores = [2];
      const result = NdcgCalculator.calculateNDCG(scores);
      // DCG = 2/log2(2) = 2
      // IDCG = 2/log2(2) = 2
      // NDCG = 2/2 = 1
      expect(result).toBeCloseTo(1.0, 5);
    });

    it('should handle realistic course retrieval scenario', () => {
      // Realistic scenario: some highly relevant, some irrelevant
      const scores = [3, 3, 2, 1, 0, 2, 1, 0];
      const result = NdcgCalculator.calculateNDCG(scores, 5);
      // Should be reasonably high (good ranking)
      expect(result).toBeGreaterThan(0.7);
      expect(result).toBeLessThanOrEqual(1.0);
    });
  });

  describe('calculateNDCGAtK', () => {
    it('should calculate NDCG at multiple K values', () => {
      const scores = [3, 2, 1, 0, 2, 1];
      const results = NdcgCalculator.calculateNDCGAtK(scores, [3, 5, 10]);

      expect(results.size).toBe(3);
      expect(results.has(3)).toBe(true);
      expect(results.has(5)).toBe(true);
      expect(results.has(10)).toBe(true);

      // NDCG should decrease or stay same as K increases (with more data)
      const ndcg3 = results.get(3)!;
      const ndcg5 = results.get(5)!;
      const ndcg10 = results.get(10)!;

      // All should be valid NDCG values
      expect(ndcg3).toBeGreaterThan(0);
      expect(ndcg3).toBeLessThanOrEqual(1);
      expect(ndcg5).toBeGreaterThan(0);
      expect(ndcg5).toBeLessThanOrEqual(1);
      expect(ndcg10).toBeGreaterThan(0);
      expect(ndcg10).toBeLessThanOrEqual(1);
    });

    it('should handle empty kValues array', () => {
      const scores = [3, 2, 1];
      const results = NdcgCalculator.calculateNDCGAtK(scores, []);
      expect(results.size).toBe(0);
    });

    it('should handle k larger than array length', () => {
      const scores = [3, 2];
      const results = NdcgCalculator.calculateNDCGAtK(scores, [5, 10]);
      // Should still calculate, just using available scores
      expect(results.size).toBe(2);
      expect(results.get(5)).toBeCloseTo(1.0, 5); // Perfect (only 2 scores)
    });
  });

  describe('edge cases', () => {
    it('should handle identical scores', () => {
      const scores = [2, 2, 2, 2];
      const result = NdcgCalculator.calculateNDCG(scores);
      expect(result).toBeCloseTo(1.0, 5); // All same = perfect ranking
    });

    it('should handle single irrelevant course', () => {
      const scores = [0];
      const result = NdcgCalculator.calculateNDCG(scores);
      // DCG = 0, IDCG = 0, should return 0 (avoid division by zero)
      expect(result).toBe(0);
    });

    it('should handle mostly relevant with one irrelevant', () => {
      const scores = [3, 3, 3, 3, 0];
      const result = NdcgCalculator.calculateNDCG(scores);
      // Should still be very high (0.85+)
      expect(result).toBeGreaterThan(0.85);
    });

    it('should handle worst case: irrelevant first, relevant last', () => {
      const scores = [0, 0, 0, 3, 3, 3];
      const result = NdcgCalculator.calculateNDCG(scores, 6);
      // Should be quite low due to poor ranking
      expect(result).toBeLessThan(0.6);
    });
  });
});
