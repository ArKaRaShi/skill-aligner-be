import { DistributionCalculator } from '../distribution-calculator';

describe('DistributionCalculator', () => {
  describe('calculateDistribution', () => {
    it('should calculate distribution for unique scores [0,1,2,3]', () => {
      // Arrange
      const scores = [0, 1, 2, 3];
      const total = 4;

      // Act
      const result = DistributionCalculator.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toHaveLength(4);
      expect(result).toContainEqual({
        relevanceScore: 0,
        count: 1,
        percentage: 25,
      });
      expect(result).toContainEqual({
        relevanceScore: 1,
        count: 1,
        percentage: 25,
      });
      expect(result).toContainEqual({
        relevanceScore: 2,
        count: 1,
        percentage: 25,
      });
      expect(result).toContainEqual({
        relevanceScore: 3,
        count: 1,
        percentage: 25,
      });
    });

    it('should calculate distribution with repeated scores', () => {
      // Arrange
      const scores = [3, 3, 3, 1, 1, 0];
      const total = 6;

      // Act
      const result = DistributionCalculator.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toContainEqual({
        relevanceScore: 3,
        count: 3,
        percentage: 50,
      });
      expect(result).toContainEqual({
        relevanceScore: 1,
        count: 2,
        percentage: (2 / 6) * 100,
      });
      expect(result).toContainEqual({
        relevanceScore: 0,
        count: 1,
        percentage: (1 / 6) * 100,
      });
    });

    it('should handle all identical scores', () => {
      // Arrange
      const scores = [2, 2, 2, 2, 2];
      const total = 5;

      // Act
      const result = DistributionCalculator.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result).toEqual([
        {
          relevanceScore: 2,
          count: 5,
          percentage: 100,
        },
      ]);
    });

    it('should handle empty scores array', () => {
      // Arrange
      const scores: number[] = [];
      const total = 0;

      // Act
      const result = DistributionCalculator.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle single score', () => {
      // Arrange
      const scores = [3];
      const total = 1;

      // Act
      const result = DistributionCalculator.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toEqual([
        {
          relevanceScore: 3,
          count: 1,
          percentage: 100,
        },
      ]);
    });

    it('should calculate percentages correctly for uneven division', () => {
      // Arrange
      const scores = [3, 2, 1];
      const total = 3;

      // Act
      const result = DistributionCalculator.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toHaveLength(3);
      result.forEach((item) => {
        expect(item.count).toBe(1);
        expect(item.percentage).toBeCloseTo(33.33, 2);
      });
    });

    it('should cast relevanceScore to 0 | 1 | 2 | 3 type', () => {
      // Arrange
      const scores = [0, 1, 2, 3];
      const total = 4;

      // Act
      const result = DistributionCalculator.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result[0].relevanceScore).toBe(0);
      expect(result[1].relevanceScore).toBe(1);
      expect(result[2].relevanceScore).toBe(2);
      expect(result[3].relevanceScore).toBe(3);
    });

    it('should preserve insertion order from Map', () => {
      // Arrange: Scores in descending order
      const scores = [3, 2, 1, 0];
      const total = 4;

      // Act
      const result = DistributionCalculator.calculateDistribution(
        scores,
        total,
      );

      // Assert: Result should maintain insertion order from Map
      expect(result[0].relevanceScore).toBe(3);
      expect(result[1].relevanceScore).toBe(2);
      expect(result[2].relevanceScore).toBe(1);
      expect(result[3].relevanceScore).toBe(0);
    });

    it('should verify percentage is not NaN', () => {
      // Arrange
      const scores = [1, 2];
      const total = 2;

      // Act
      const result = DistributionCalculator.calculateDistribution(
        scores,
        total,
      );

      // Assert
      result.forEach((item) => {
        expect(item.percentage).not.toBeNaN();
        expect(isFinite(item.percentage)).toBe(true);
      });
    });
  });
});
