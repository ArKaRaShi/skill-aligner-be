import { describe, expect, it } from '@jest/globals';

import { CourseRetrievalMetricsCalculator } from '../../../course-retrieval-metrics-calculator.service';

describe('CourseRetrievalMetricsCalculator', () => {
  describe('buildEnrichedIterationMetrics', () => {
    const createMetrics = (
      overrides: Partial<{
        totalCourses: number;
        meanRelevanceScore: number;
        perClassDistribution: {
          score0: {
            relevanceScore: 0;
            count: number;
            macroAverageRate: number;
            microAverageRate: number;
            label: 'irrelevant';
          };
          score1: {
            relevanceScore: 1;
            count: number;
            macroAverageRate: number;
            microAverageRate: number;
            label: 'slightly_relevant';
          };
          score2: {
            relevanceScore: 2;
            count: number;
            macroAverageRate: number;
            microAverageRate: number;
            label: 'fairly_relevant';
          };
          score3: {
            relevanceScore: 3;
            count: number;
            macroAverageRate: number;
            microAverageRate: number;
            label: 'highly_relevant';
          };
        };
        ndcg: {
          proxy: { at5: number; at10: number; at15: number; atAll: number };
          ideal: { at5: number; at10: number; at15: number; atAll: number };
        };
        precision: {
          at5: { threshold1: number; threshold2: number; threshold3: number };
          at10: { threshold1: number; threshold2: number; threshold3: number };
          at15: { threshold1: number; threshold2: number; threshold3: number };
          atAll: { threshold1: number; threshold2: number; threshold3: number };
        };
      }> = {},
    ): ReturnType<
      typeof CourseRetrievalMetricsCalculator.calculateMetrics
    > => ({
      totalCourses: 100,
      meanRelevanceScore: 1.5,
      perClassDistribution: {
        score0: {
          relevanceScore: 0,
          count: 20,
          macroAverageRate: 20,
          microAverageRate: 20,
          label: 'irrelevant',
        },
        score1: {
          relevanceScore: 1,
          count: 30,
          macroAverageRate: 30,
          microAverageRate: 30,
          label: 'slightly_relevant',
        },
        score2: {
          relevanceScore: 2,
          count: 30,
          macroAverageRate: 30,
          microAverageRate: 30,
          label: 'fairly_relevant',
        },
        score3: {
          relevanceScore: 3,
          count: 20,
          macroAverageRate: 20,
          microAverageRate: 20,
          label: 'highly_relevant',
        },
      },
      ndcg: {
        proxy: { at5: 0.65, at10: 0.75, at15: 0.78, atAll: 0.8 },
        ideal: { at5: 0.5, at10: 0.6, at15: 0.63, atAll: 0.65 },
      },
      precision: {
        at5: { threshold1: 0.7, threshold2: 0.45, threshold3: 0.2 },
        at10: { threshold1: 0.65, threshold2: 0.4, threshold3: 0.18 },
        at15: { threshold1: 0.63, threshold2: 0.38, threshold3: 0.17 },
        atAll: { threshold1: 0.6, threshold2: 0.35, threshold3: 0.15 },
      },
      ...overrides,
    });

    it('should build enriched metrics with all required fields', () => {
      // Arrange
      const metrics = createMetrics();
      const sampleCount = 10;
      const iterationNumber = 1;

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount,
          iterationNumber,
        });

      // Assert - basic structure
      expect(result.iteration).toBe(iterationNumber);
      expect(result.timestamp).toBeDefined();
      expect(result.sampleCount).toBe(sampleCount);
      expect(result.totalCoursesEvaluated).toBe(metrics.totalCourses);
    });

    it('should enrich meanRelevanceScore with context', () => {
      // Arrange
      const metrics = createMetrics({
        totalCourses: 100,
        meanRelevanceScore: 1.5,
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 10,
          iterationNumber: 1,
        });

      // Assert
      expect(result.meanRelevanceScore.meanRelevanceScore).toBe(1.5);
      expect(result.meanRelevanceScore.totalRelevanceSum).toBe(150); // 1.5 * 100
      expect(result.meanRelevanceScore.totalCourses).toBe(100);
      expect(result.meanRelevanceScore.description).toContain('1.5');
      expect(result.meanRelevanceScore.description).toContain('100');
    });

    it('should enrich perClassDistribution.score3 (highly relevant) with context', () => {
      // Arrange
      const metrics = createMetrics({
        perClassDistribution: {
          score0: {
            relevanceScore: 0,
            count: 25,
            macroAverageRate: 25,
            microAverageRate: 25,
            label: 'irrelevant',
          },
          score1: {
            relevanceScore: 1,
            count: 20,
            macroAverageRate: 20,
            microAverageRate: 20,
            label: 'slightly_relevant',
          },
          score2: {
            relevanceScore: 2,
            count: 20,
            macroAverageRate: 20,
            microAverageRate: 20,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 15,
            macroAverageRate: 15,
            microAverageRate: 15,
            label: 'highly_relevant',
          },
        },
        totalCourses: 100,
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 10,
          iterationNumber: 1,
        });

      // Assert
      expect(result.perClassDistribution.score3.macroAverageRate).toBeCloseTo(
        15,
      );
      expect(result.perClassDistribution.score3.count).toBe(15);
      expect(result.perClassDistribution.score3.totalCount).toBe(100);
      expect(result.perClassDistribution.score3.description).toContain('15');
      expect(result.perClassDistribution.score3.description).toContain(
        'highly',
      );
    });

    it('should enrich perClassDistribution.score0 (irrelevant) with context', () => {
      // Arrange
      const metrics = createMetrics({
        perClassDistribution: {
          score0: {
            relevanceScore: 0,
            count: 25,
            macroAverageRate: 25,
            microAverageRate: 25,
            label: 'irrelevant',
          },
          score1: {
            relevanceScore: 1,
            count: 20,
            macroAverageRate: 20,
            microAverageRate: 20,
            label: 'slightly_relevant',
          },
          score2: {
            relevanceScore: 2,
            count: 20,
            macroAverageRate: 20,
            microAverageRate: 20,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 15,
            macroAverageRate: 15,
            microAverageRate: 15,
            label: 'highly_relevant',
          },
        },
        totalCourses: 100,
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 10,
          iterationNumber: 1,
        });

      // Assert
      expect(result.perClassDistribution.score0.macroAverageRate).toBeCloseTo(
        25,
      );
      expect(result.perClassDistribution.score0.count).toBe(25);
      expect(result.perClassDistribution.score0.totalCount).toBe(100);
      expect(result.perClassDistribution.score0.description).toContain('25');
    });

    it('should enrich NDCG metrics with descriptions', () => {
      // Arrange
      const metrics = createMetrics({
        ndcg: {
          proxy: { at5: 0.92, at10: 0.85, at15: 0.87, atAll: 0.88 },
          ideal: { at5: 0.7, at10: 0.65, at15: 0.67, atAll: 0.7 },
        },
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 10,
          iterationNumber: 1,
        });

      // Assert
      expect(result.ndcg.at5.proxyNdcg).toBeCloseTo(0.92);
      expect(result.ndcg.at5.idealNdcg).toBeCloseTo(0.7);
      expect(result.ndcg.at5.description).toContain('Proxy: 0.92');
      expect(result.ndcg.at5.description).toContain('Ideal: 0.7');
      expect(result.ndcg.at5.description).toContain('Excellent');
      expect(result.ndcg.at10.description).toContain('0.85');
      expect(result.ndcg.at10.description).toContain('Good');
      expect(result.ndcg.atAll.description).toContain('0.88');
    });

    it('should enrich Precision metrics with context', () => {
      // Arrange
      const metrics = createMetrics({
        precision: {
          at5: { threshold1: 0.7, threshold2: 0.6, threshold3: 0.3 },
          at10: { threshold1: 0.65, threshold2: 0.5, threshold3: 0.25 },
          at15: { threshold1: 0.63, threshold2: 0.45, threshold3: 0.23 },
          atAll: { threshold1: 0.6, threshold2: 0.4, threshold3: 0.2 },
        },
        totalCourses: 100,
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 10,
          iterationNumber: 1,
        });

      // Assert - Use threshold2 for standard metric (≥2)
      expect(result.precision.at5.threshold2.meanPrecision).toBeCloseTo(0.6);
      expect(result.precision.at5.threshold2.description).toContain('60.0%');
      expect(result.precision.at10.threshold2.description).toContain('50.0%');
      expect(result.precision.atAll.threshold2.description).toContain('40.0%');
    });

    it('should assign correct quality rating for NDCG values', () => {
      // Test different NDCG values
      const testCases = [
        { ndcgValue: 0.95, expectedQuality: 'Excellent' },
        { ndcgValue: 0.85, expectedQuality: 'Good' },
        { ndcgValue: 0.75, expectedQuality: 'Reasonable' },
        { ndcgValue: 0.65, expectedQuality: 'Fair' },
        { ndcgValue: 0.55, expectedQuality: 'Poor' },
        { ndcgValue: 0.45, expectedQuality: 'Very Poor' },
      ];

      for (const { ndcgValue, expectedQuality } of testCases) {
        const metrics = createMetrics({
          ndcg: {
            proxy: {
              at5: ndcgValue,
              at10: ndcgValue,
              at15: ndcgValue,
              atAll: ndcgValue,
            },
            ideal: {
              at5: ndcgValue - 0.1,
              at10: ndcgValue - 0.1,
              at15: ndcgValue - 0.1,
              atAll: ndcgValue - 0.1,
            },
          },
        });

        const result =
          CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
            metrics,
            sampleCount: 10,
            iterationNumber: 1,
          });

        expect(result.ndcg.at5.description).toContain(expectedQuality);
        expect(result.ndcg.at10.description).toContain(expectedQuality);
      }
    });

    it('should handle perfect scores', () => {
      // Arrange
      const metrics = createMetrics({
        meanRelevanceScore: 3.0,
        perClassDistribution: {
          score0: {
            relevanceScore: 0,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'irrelevant',
          },
          score1: {
            relevanceScore: 1,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'slightly_relevant',
          },
          score2: {
            relevanceScore: 2,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 50,
            macroAverageRate: 100,
            microAverageRate: 100,
            label: 'highly_relevant',
          },
        },
        ndcg: {
          proxy: { at5: 1.0, at10: 1.0, at15: 1.0, atAll: 1.0 },
          ideal: { at5: 1.0, at10: 1.0, at15: 1.0, atAll: 1.0 },
        },
        precision: {
          at5: { threshold1: 1.0, threshold2: 1.0, threshold3: 1.0 },
          at10: { threshold1: 1.0, threshold2: 1.0, threshold3: 1.0 },
          at15: { threshold1: 1.0, threshold2: 1.0, threshold3: 1.0 },
          atAll: { threshold1: 1.0, threshold2: 1.0, threshold3: 1.0 },
        },
        totalCourses: 50,
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 5,
          iterationNumber: 1,
        });

      // Assert
      expect(result.meanRelevanceScore.meanRelevanceScore).toBe(3.0);
      expect(result.ndcg.at5.description).toContain('Excellent');
      expect(result.precision.at5.threshold2.meanPrecision).toBe(1.0);
    });

    it('should handle zero scores', () => {
      // Arrange
      const metrics = createMetrics({
        meanRelevanceScore: 0,
        perClassDistribution: {
          score0: {
            relevanceScore: 0,
            count: 50,
            macroAverageRate: 100,
            microAverageRate: 100,
            label: 'irrelevant',
          },
          score1: {
            relevanceScore: 1,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'slightly_relevant',
          },
          score2: {
            relevanceScore: 2,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'highly_relevant',
          },
        },
        ndcg: {
          proxy: { at5: 0, at10: 0, at15: 0, atAll: 0 },
          ideal: { at5: 0, at10: 0, at15: 0, atAll: 0 },
        },
        precision: {
          at5: { threshold1: 0, threshold2: 0, threshold3: 0 },
          at10: { threshold1: 0, threshold2: 0, threshold3: 0 },
          at15: { threshold1: 0, threshold2: 0, threshold3: 0 },
          atAll: { threshold1: 0, threshold2: 0, threshold3: 0 },
        },
        totalCourses: 50,
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 5,
          iterationNumber: 1,
        });

      // Assert
      expect(result.ndcg.at5.description).toContain('Very Poor');
      expect(result.precision.at5.threshold2.meanPrecision).toBe(0);
    });

    it('should format numbers to 2 decimal places', () => {
      // Arrange
      const metrics = createMetrics({
        meanRelevanceScore: 1.333333,
        perClassDistribution: {
          score0: {
            relevanceScore: 0,
            count: 10,
            macroAverageRate: 20,
            microAverageRate: 20,
            label: 'irrelevant',
          },
          score1: {
            relevanceScore: 1,
            count: 10,
            macroAverageRate: 20,
            microAverageRate: 20,
            label: 'slightly_relevant',
          },
          score2: {
            relevanceScore: 2,
            count: 15,
            macroAverageRate: 30,
            microAverageRate: 30,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 15,
            macroAverageRate: 30,
            microAverageRate: 30,
            label: 'highly_relevant',
          },
        },
        ndcg: {
          proxy: {
            at5: 0.691588,
            at10: 0.823588,
            at15: 0.827,
            atAll: 0.830118,
          },
          ideal: {
            at5: 0.691588,
            at10: 0.823588,
            at15: 0.827,
            atAll: 0.830118,
          },
        },
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 17,
          iterationNumber: 1,
        });

      // Assert - should be rounded to 2 decimal places
      expect(result.meanRelevanceScore.meanRelevanceScore).toBeCloseTo(1.33);
      expect(result.perClassDistribution.score3.macroAverageRate).toBeCloseTo(
        30,
      );
      expect(result.ndcg.at5.proxyNdcg).toBeCloseTo(0.69);
      expect(result.ndcg.at10.proxyNdcg).toBeCloseTo(0.82);
    });
  });
});
