import { DistributionStatisticsHelper } from '../distribution-statistics.helper';

/**
 * Unit tests for DistributionStatisticsHelper
 *
 * Tests statistical calculations including:
 * - Standard deviation
 * - Pearson correlation
 * - Histogram binning
 * - Percentile calculation
 */
describe('DistributionStatisticsHelper', () => {
  describe('computeDistributionStats', () => {
    it('should compute statistics for a non-empty array', () => {
      // Arrange
      const values = [1, 2, 3, 4, 5];

      // Act
      const result =
        DistributionStatisticsHelper.computeDistributionStats(values);

      // Assert
      expect(result.count).toBe(5);
      expect(result.sum).toBe(15);
      expect(result.average).toBe(3);
      expect(result.min).toBe(1);
      expect(result.max).toBe(5);
      expect(result.stdDev).toBeCloseTo(1.414, 3);
    });

    it('should return zeros for empty array', () => {
      // Arrange
      const values: number[] = [];

      // Act
      const result =
        DistributionStatisticsHelper.computeDistributionStats(values);

      // Assert
      expect(result.count).toBe(0);
      expect(result.sum).toBe(0);
      expect(result.average).toBe(0);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
      expect(result.stdDev).toBe(0);
    });

    it('should handle single value array', () => {
      // Arrange
      const values = [42];

      // Act
      const result =
        DistributionStatisticsHelper.computeDistributionStats(values);

      // Assert
      expect(result.count).toBe(1);
      expect(result.sum).toBe(42);
      expect(result.average).toBe(42);
      expect(result.min).toBe(42);
      expect(result.max).toBe(42);
      expect(result.stdDev).toBe(0);
    });

    it('should compute standard deviation correctly for uniform values', () => {
      // Arrange
      const values = [5, 5, 5, 5, 5];

      // Act
      const result =
        DistributionStatisticsHelper.computeDistributionStats(values);

      // Assert
      expect(result.average).toBe(5);
      expect(result.stdDev).toBe(0);
    });

    it('should handle decimal values', () => {
      // Arrange
      const values = [0.1, 0.2, 0.3];

      // Act
      const result =
        DistributionStatisticsHelper.computeDistributionStats(values);

      // Assert
      expect(result.count).toBe(3);
      expect(result.sum).toBeCloseTo(0.6, 6);
      expect(result.average).toBeCloseTo(0.2, 6);
      expect(result.stdDev).toBeCloseTo(0.0816, 3);
    });

    it('should handle negative values', () => {
      // Arrange
      const values = [-5, 0, 5];

      // Act
      const result =
        DistributionStatisticsHelper.computeDistributionStats(values);

      // Assert
      expect(result.average).toBe(0);
      expect(result.stdDev).toBeCloseTo(4.082, 3);
    });
  });

  describe('computeCorrelation', () => {
    it('should compute perfect positive correlation (r = 1)', () => {
      // Arrange
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];

      // Act
      const result = DistributionStatisticsHelper.computeCorrelation(x, y);

      // Assert
      expect(result).toBeCloseTo(1, 6);
    });

    it('should compute perfect negative correlation (r = -1)', () => {
      // Arrange
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];

      // Act
      const result = DistributionStatisticsHelper.computeCorrelation(x, y);

      // Assert
      expect(result).toBeCloseTo(-1, 6);
    });

    it('should compute no correlation (r = 0)', () => {
      // Arrange
      const x = [1, 2, 3, 4, 5];
      const y = [2, 2, 2, 2, 2];

      // Act
      const result = DistributionStatisticsHelper.computeCorrelation(x, y);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 for empty arrays', () => {
      // Arrange
      const x: number[] = [];
      const y: number[] = [];

      // Act
      const result = DistributionStatisticsHelper.computeCorrelation(x, y);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 for arrays of different lengths', () => {
      // Arrange
      const x = [1, 2, 3];
      const y = [1, 2];

      // Act
      const result = DistributionStatisticsHelper.computeCorrelation(x, y);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle single value arrays', () => {
      // Arrange
      const x = [5];
      const y = [10];

      // Act
      const result = DistributionStatisticsHelper.computeCorrelation(x, y);

      // Assert
      // Single point has undefined correlation, should return 0
      expect(result).toBe(0);
    });

    it('should compute correlation for real-world data', () => {
      // Arrange
      const skillsExtracted = [2, 3, 4, 5, 6];
      const coursesReturned = [25, 30, 42, 55, 60];

      // Act
      const result = DistributionStatisticsHelper.computeCorrelation(
        skillsExtracted,
        coursesReturned,
      );

      // Assert
      // Should have strong positive correlation
      expect(result).toBeGreaterThan(0.9);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  describe('createHistogram', () => {
    it('should create histogram with default bucket size', () => {
      // Arrange
      const values = [5, 12, 18, 25, 32, 38, 45];

      // Act
      const result = DistributionStatisticsHelper.createHistogram(values, 10);

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('range');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('percentage');

      // Verify percentages sum to 100
      const totalPercentage = result.reduce((sum, b) => sum + b.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);
    });

    it('should create histogram with custom bucket size', () => {
      // Arrange
      const values = [1, 5, 15, 25, 35];

      // Act
      const result = DistributionStatisticsHelper.createHistogram(values, 20);

      // Assert
      expect(result.length).toBe(2);
      expect(result[0].range).toBe('0-19');
      expect(result[1].range).toBe('20-39');
    });

    it('should handle empty array', () => {
      // Arrange
      const values: number[] = [];

      // Act
      const result = DistributionStatisticsHelper.createHistogram(values, 10);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle single value', () => {
      // Arrange
      const values = [42];

      // Act
      const result = DistributionStatisticsHelper.createHistogram(values, 10);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].range).toBe('42');
      expect(result[0].count).toBe(1);
      expect(result[0].percentage).toBe(100);
    });

    it('should handle all same values', () => {
      // Arrange
      const values = [10, 10, 10, 10, 10];

      // Act
      const result = DistributionStatisticsHelper.createHistogram(values, 10);

      // Assert
      expect(result.length).toBe(1);
      expect(result[0].range).toBe('10');
      expect(result[0].count).toBe(5);
      expect(result[0].percentage).toBe(100);
    });

    it('should sort buckets by range start', () => {
      // Arrange
      const values = [35, 5, 25, 15];

      // Act
      const result = DistributionStatisticsHelper.createHistogram(values, 10);

      // Assert
      const ranges = result.map((b) => b.range);
      // Should be sorted: 0-9, 10-19, 20-29, 30-39
      for (let i = 1; i < ranges.length; i++) {
        const prevStart = Number.parseInt(ranges[i - 1].split('-')[0], 10);
        const currStart = Number.parseInt(ranges[i].split('-')[0], 10);
        expect(currStart).toBeGreaterThan(prevStart);
      }
    });

    it('should calculate correct counts per bucket', () => {
      // Arrange
      const values = [5, 8, 12, 15, 22, 25, 28];

      // Act
      const result = DistributionStatisticsHelper.createHistogram(values, 10);

      // Assert
      // 0-9: [5, 8] = 2 values
      // 10-19: [12, 15] = 2 values
      // 20-29: [22, 25, 28] = 3 values
      const bucket0to9 = result.find((b) => b.range === '0-9');
      const bucket10to19 = result.find((b) => b.range === '10-19');
      const bucket20to29 = result.find((b) => b.range === '20-29');

      expect(bucket0to9?.count).toBe(2);
      expect(bucket10to19?.count).toBe(2);
      expect(bucket20to29?.count).toBe(3);
    });

    it('should calculate correct percentages', () => {
      // Arrange
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      // Act
      const result = DistributionStatisticsHelper.createHistogram(values, 5);

      // Assert
      // 0-4: [1, 2, 3, 4] = 4 values = 40%
      // 5-9: [5, 6, 7, 8, 9] = 5 values = 50%
      // 10-14: [10] = 1 value = 10%
      const bucket0to4 = result.find((b) => b.range === '0-4');
      const bucket5to9 = result.find((b) => b.range === '5-9');
      const bucket10to14 = result.find((b) => b.range === '10-14');

      expect(bucket0to4?.percentage).toBeCloseTo(40, 1);
      expect(bucket5to9?.percentage).toBeCloseTo(50, 1);
      expect(bucket10to14?.percentage).toBeCloseTo(10, 1);
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate minimum (p0)', () => {
      // Arrange
      const sortedValues = [1, 2, 3, 4, 5];

      // Act
      const result = DistributionStatisticsHelper.calculatePercentile(
        sortedValues,
        0,
      );

      // Assert
      expect(result).toBe(1);
    });

    it('should calculate maximum (p100)', () => {
      // Arrange
      const sortedValues = [1, 2, 3, 4, 5];

      // Act
      const result = DistributionStatisticsHelper.calculatePercentile(
        sortedValues,
        100,
      );

      // Assert
      expect(result).toBe(5);
    });

    it('should calculate median (p50)', () => {
      // Arrange
      const sortedValues = [1, 2, 3, 4, 5];

      // Act
      const result = DistributionStatisticsHelper.calculatePercentile(
        sortedValues,
        50,
      );

      // Assert
      expect(result).toBe(3);
    });

    it('should handle even number of elements', () => {
      // Arrange
      const sortedValues = [1, 2, 3, 4];

      // Act
      const result = DistributionStatisticsHelper.calculatePercentile(
        sortedValues,
        50,
      );

      // Assert
      // Should interpolate between 2 and 3
      expect(result).toBeGreaterThanOrEqual(2);
      expect(result).toBeLessThanOrEqual(3);
    });

    it('should return 0 for empty array', () => {
      // Arrange
      const sortedValues: number[] = [];

      // Act
      const result = DistributionStatisticsHelper.calculatePercentile(
        sortedValues,
        50,
      );

      // Assert
      expect(result).toBe(0);
    });

    it('should calculate p25 (first quartile)', () => {
      // Arrange
      const sortedValues = [1, 2, 3, 4, 5, 6, 7, 8];

      // Act
      const result = DistributionStatisticsHelper.calculatePercentile(
        sortedValues,
        25,
      );

      // Assert
      expect(result).toBeCloseTo(2.75, 2);
    });

    it('should calculate p95', () => {
      // Arrange
      const sortedValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      // Act
      const result = DistributionStatisticsHelper.calculatePercentile(
        sortedValues,
        95,
      );

      // Assert
      expect(result).toBeCloseTo(9.55, 2);
    });
  });
});
