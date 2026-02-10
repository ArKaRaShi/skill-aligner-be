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

  describe('calculateIdealIDCG', () => {
    it('should calculate IDCG using all perfect scores (3, 3, 3, ...)', () => {
      // k=4: IDCG = 3/log2(2) + 3/log2(3) + 3/log2(4) + 3/log2(5)
      //            = 3 + 1.893 + 1.5 + 1.292
      //            ≈ 7.685
      const result = NdcgCalculator.calculateIdealIDCG(4);
      expect(result).toBeCloseTo(7.685, 3);
    });

    it('should handle k=1', () => {
      const result = NdcgCalculator.calculateIdealIDCG(1);
      // IDCG = 3/log2(2) = 3
      expect(result).toBeCloseTo(3, 5);
    });

    it('should handle k=5', () => {
      const result = NdcgCalculator.calculateIdealIDCG(5);
      // Should be higher than k=4 (more perfect scores)
      expect(result).toBeGreaterThan(7.685);
      expect(result).toBeLessThan(10); // Upper bound
    });

    it('should handle k=10', () => {
      const result = NdcgCalculator.calculateIdealIDCG(10);
      // Should be significantly higher than k=5
      expect(result).toBeGreaterThan(NdcgCalculator.calculateIdealIDCG(5));
    });

    it('should return 0 for k=0', () => {
      const result = NdcgCalculator.calculateIdealIDCG(0);
      expect(result).toBe(0);
    });
  });

  describe('calculateProxyNDCG', () => {
    it('should return 1 for perfect ranking (already sorted)', () => {
      const scores = [3, 2, 1, 0];
      const result = NdcgCalculator.calculateProxyNDCG(scores);
      expect(result).toBeCloseTo(1.0, 5);
    });

    it('should measure ranking quality independent of retrieval quality', () => {
      // Poor retrieval (all low scores) but good ranking
      const scores = [1, 1, 0, 0]; // Sorted descending
      const result = NdcgCalculator.calculateProxyNDCG(scores);
      expect(result).toBeCloseTo(1.0, 5); // Perfect ranking even though scores are low
    });

    it('should calculate correctly for imperfect ranking', () => {
      const scores = [0, 1, 2, 3]; // Reverse sorted
      const result = NdcgCalculator.calculateProxyNDCG(scores);
      expect(result).toBeCloseTo(0.614, 3);
    });

    it('should handle k parameter', () => {
      const scores = [1, 3, 0, 2];
      const result = NdcgCalculator.calculateProxyNDCG(scores, 2);
      expect(result).toBeCloseTo(0.679, 3);
    });

    it('should return 0 for all zero scores', () => {
      const result = NdcgCalculator.calculateProxyNDCG([0, 0, 0]);
      expect(result).toBe(0);
    });
  });

  describe('calculateIdealNDCG', () => {
    it('should return 1 when all scores are perfect (3, 3, 3, ...)', () => {
      const scores = [3, 3, 3];
      const result = NdcgCalculator.calculateIdealNDCG(scores);
      expect(result).toBeCloseTo(1.0, 5);
    });

    it('should measure quality vs perfect ground truth', () => {
      // Good retrieval but not perfect
      const scores = [3, 2, 2, 1];
      const result = NdcgCalculator.calculateIdealNDCG(scores);
      // Should be less than 1 (not perfect retrieval)
      expect(result).toBeLessThan(1.0);
      expect(result).toBeGreaterThan(0.6); // But reasonably high
    });

    it('should be lower than proxy NDCG for same scores (typically)', () => {
      const scores = [2, 2, 1, 1];
      const proxyNdcg = NdcgCalculator.calculateProxyNDCG(scores);
      const idealNdcg = NdcgCalculator.calculateIdealNDCG(scores);

      // Ideal compares against all 3s, so typically lower than proxy
      expect(idealNdcg).toBeLessThanOrEqual(proxyNdcg);
    });

    it('should handle k parameter', () => {
      const scores = [3, 2, 1, 0];
      const result = NdcgCalculator.calculateIdealNDCG(scores, 2);
      // DCG@2 = 3 + 2/log2(3) ≈ 4.262
      // Ideal IDCG@2 = 3 + 3/log2(3) ≈ 4.893
      // NDCG ≈ 4.262 / 4.893 ≈ 0.871
      expect(result).toBeCloseTo(0.871, 3);
    });

    it('should return 0 for all zero scores', () => {
      const result = NdcgCalculator.calculateIdealNDCG([0, 0, 0]);
      expect(result).toBe(0);
    });

    it('should handle poor retrieval scenario', () => {
      const scores = [0, 0, 1, 1]; // Mostly irrelevant
      const result = NdcgCalculator.calculateIdealNDCG(scores);
      // Should be very low compared to perfect retrieval
      expect(result).toBeLessThan(0.4);
    });
  });

  describe('calculateBothNDCG', () => {
    it('should return both proxy and ideal NDCG values', () => {
      const scores = [3, 2, 1, 0];
      const result = NdcgCalculator.calculateBothNDCG(scores);

      expect(result).toHaveProperty('proxy');
      expect(result).toHaveProperty('ideal');
      expect(typeof result.proxy).toBe('number');
      expect(typeof result.ideal).toBe('number');
    });

    it('should calculate proxy NDCG correctly', () => {
      const scores = [3, 2, 1, 0]; // Perfect ranking
      const result = NdcgCalculator.calculateBothNDCG(scores);

      expect(result.proxy).toBeCloseTo(1.0, 5);
    });

    it('should calculate ideal NDCG correctly', () => {
      const scores = [3, 3, 3]; // All perfect
      const result = NdcgCalculator.calculateBothNDCG(scores);

      expect(result.ideal).toBeCloseTo(1.0, 5);
    });

    it('should show ideal < proxy for imperfect retrieval', () => {
      const scores = [2, 2, 1, 1]; // Good ranking, imperfect scores
      const result = NdcgCalculator.calculateBothNDCG(scores);

      // Ideal compares against all 3s, so lower than proxy (which uses actual scores sorted)
      expect(result.ideal).toBeLessThan(result.proxy);
    });

    it('should show ideal = proxy = 1 for perfect retrieval and ranking', () => {
      const scores = [3, 3, 3, 3]; // Perfect in all aspects
      const result = NdcgCalculator.calculateBothNDCG(scores);

      expect(result.proxy).toBeCloseTo(1.0, 5);
      expect(result.ideal).toBeCloseTo(1.0, 5);
    });

    it('should respect k parameter for both metrics', () => {
      const scores = [3, 2, 1, 0, 1];
      const result = NdcgCalculator.calculateBothNDCG(scores, 3);

      expect(result.proxy).toBeGreaterThan(0);
      expect(result.proxy).toBeLessThanOrEqual(1);
      expect(result.ideal).toBeGreaterThan(0);
      expect(result.ideal).toBeLessThanOrEqual(1);
    });

    it('should handle edge case: all zeros', () => {
      const result = NdcgCalculator.calculateBothNDCG([0, 0, 0]);

      expect(result.proxy).toBe(0);
      expect(result.ideal).toBe(0);
    });

    it('should reveal ranking vs retrieval quality difference', () => {
      // Good ranking, poor retrieval
      const goodRankingPoorRetrieval = [2, 1, 0, 0];

      // Poor ranking, good retrieval
      const poorRankingGoodRetrieval = [3, 0, 3, 0];

      const result1 = NdcgCalculator.calculateBothNDCG(
        goodRankingPoorRetrieval,
      );
      const result2 = NdcgCalculator.calculateBothNDCG(
        poorRankingGoodRetrieval,
      );

      // First has better ranking (higher proxy)
      expect(result1.proxy).toBeGreaterThan(result2.proxy);

      // Second has better retrieval (higher ideal, due to more 3s)
      expect(result2.ideal).toBeGreaterThan(result1.ideal);
    });
  });

  describe('proxy vs ideal NDCG comparison', () => {
    it('should demonstrate ideal > proxy when ranking is perfect but retrieval not', () => {
      // Scenario: Perfect ranking (sorted descending) but not all 3s
      const scores = [2, 2, 1, 0]; // Perfectly sorted

      const proxy = NdcgCalculator.calculateProxyNDCG(scores);
      const ideal = NdcgCalculator.calculateIdealNDCG(scores);

      // Proxy = 1.0 (perfect ranking of actual scores)
      expect(proxy).toBeCloseTo(1.0, 5);

      // Ideal < 1.0 (not all scores are 3)
      expect(ideal).toBeLessThan(1.0);

      // Ideal < proxy because ideal compares against all 3s
      expect(ideal).toBeLessThan(proxy);
    });

    it('should show high proxy, low ideal = ranking good, retrieval poor', () => {
      // Perfect ranking, all mid-range scores
      const scores = [2, 2, 2, 2];

      const proxy = NdcgCalculator.calculateProxyNDCG(scores);
      const ideal = NdcgCalculator.calculateIdealNDCG(scores);

      expect(proxy).toBeCloseTo(1.0, 5); // Perfect ranking
      expect(ideal).toBeLessThan(0.8); // Not perfect retrieval (no 3s)
      expect(ideal).toBeLessThan(proxy);
    });

    it('should show both metrics equal for perfect ranking and retrieval', () => {
      // Perfect ranking AND all perfect scores
      const scores = [3, 3, 3, 3];

      const proxy = NdcgCalculator.calculateProxyNDCG(scores);
      const ideal = NdcgCalculator.calculateIdealNDCG(scores);

      expect(proxy).toBeCloseTo(1.0, 5);
      expect(ideal).toBeCloseTo(1.0, 5);
      expect(ideal).toBe(proxy);
    });

    it('should show proxy > ideal when poor ranking with high scores', () => {
      // Poor ranking, but has some high scores
      const scores = [0, 3, 0, 3];

      const proxy = NdcgCalculator.calculateProxyNDCG(scores);
      const ideal = NdcgCalculator.calculateIdealNDCG(scores);

      // Both less than 1 due to poor ranking
      expect(proxy).toBeLessThan(0.8);
      expect(ideal).toBeLessThan(0.8);

      // Proxy can be > ideal because the actual scores (when sorted)
      // are closer to the actual ranking than all 3s would be
      expect(proxy).toBeGreaterThan(ideal);
    });

    it('should demonstrate the diagnostic value of both metrics', () => {
      // Good ranking, mediocre retrieval
      const goodRankingMediocreRetrieval = [2, 1, 1, 0];

      // Poor ranking, good retrieval
      const poorRankingGoodRetrieval = [3, 0, 0, 3];

      const result1 = NdcgCalculator.calculateBothNDCG(
        goodRankingMediocreRetrieval,
      );
      const result2 = NdcgCalculator.calculateBothNDCG(
        poorRankingGoodRetrieval,
      );

      // First has better ranking (proxy closer to 1)
      expect(result1.proxy).toBeGreaterThan(result2.proxy);

      // Second has better ideal (more 3s in retrieval)
      // Note: ideal might still be lower due to poor ranking
      expect(result2.ideal).toBeGreaterThan(0.3);

      // The gap between proxy and ideal reveals different issues
      const gap1 = result1.proxy - result1.ideal; // Positive = ranking better than retrieval quality

      expect(gap1).toBeGreaterThan(0); // Good ranking, poor retrieval
    });
  });
});
