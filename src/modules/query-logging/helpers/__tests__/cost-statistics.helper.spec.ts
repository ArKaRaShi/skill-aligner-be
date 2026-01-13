import { CostStatisticsHelper } from '../cost-statistics.helper';

describe('CostStatisticsHelper', () => {
  describe('computeStatistics', () => {
    it('should compute statistics for a single value', () => {
      // Arrange
      const values = [0.005];

      // Act
      const result = CostStatisticsHelper.computeStatistics(values);

      // Assert
      expect(result).toEqual({
        count: 1,
        sum: 0.005,
        average: 0.005,
        min: 0.005,
        max: 0.005,
      });
    });

    it('should compute statistics for multiple values', () => {
      // Arrange
      const values = [0.001, 0.002, 0.003, 0.004, 0.005];

      // Act
      const result = CostStatisticsHelper.computeStatistics(values);

      // Assert
      expect(result.count).toBe(5);
      expect(result.sum).toBe(0.015);
      expect(result.average).toBe(0.003);
      expect(result.min).toBe(0.001);
      expect(result.max).toBe(0.005);
    });

    it('should compute correct average for varying costs', () => {
      // Arrange
      const values = [0.01, 0.02, 0.05, 0.1];

      // Act
      const result = CostStatisticsHelper.computeStatistics(values);

      // Assert
      expect(result.average).toBe(0.045);
      expect(result.sum).toBe(0.18);
    });

    it('should handle zero values', () => {
      // Arrange
      const values = [0, 0, 0];

      // Act
      const result = CostStatisticsHelper.computeStatistics(values);

      // Assert
      expect(result).toEqual({
        count: 3,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
      });
    });

    it('should handle very small cost values', () => {
      // Arrange
      const values = [0.0001, 0.0002, 0.0003];

      // Act
      const result = CostStatisticsHelper.computeStatistics(values);

      // Assert
      expect(result.count).toBe(3);
      expect(result.sum).toBeCloseTo(0.0006, 6);
      expect(result.average).toBeCloseTo(0.0002, 6);
    });

    it('should throw error for empty array', () => {
      // Arrange
      const values: number[] = [];

      // Act & Assert
      expect(() => CostStatisticsHelper.computeStatistics(values)).toThrow(
        'Cannot compute statistics on empty array',
      );
    });
  });

  describe('computeStatisticsSafe', () => {
    it('should compute statistics for array with valid values', () => {
      // Arrange
      const values = [0.001, 0.002, null, 0.003, undefined];

      // Act
      const result = CostStatisticsHelper.computeStatisticsSafe(values);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.count).toBe(3);
      expect(result?.sum).toBe(0.006);
      expect(result?.average).toBe(0.002);
    });

    it('should return null when all values are null or undefined', () => {
      // Arrange
      const values = [null, undefined, null];

      // Act
      const result = CostStatisticsHelper.computeStatisticsSafe(values);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty array', () => {
      // Arrange
      const values: Array<number | null | undefined> = [];

      // Act
      const result = CostStatisticsHelper.computeStatisticsSafe(values);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle array with only zeros', () => {
      // Arrange
      const values = [0, 0, 0];

      // Act
      const result = CostStatisticsHelper.computeStatisticsSafe(values);

      // Assert
      expect(result).toEqual({
        count: 3,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
      });
    });
  });
});
