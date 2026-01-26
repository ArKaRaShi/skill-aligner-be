import { describe, expect, it } from '@jest/globals';

import type { EvaluationItem } from '../../../../types/course-retrieval.types';
import { CourseRetrievalMetricsCalculator } from '../../../course-retrieval-metrics-calculator.service';

describe('CourseRetrievalMetricsCalculator', () => {
  describe('calculateMeanMetrics', () => {
    const createEvaluationItem = (
      overrides: Partial<EvaluationItem> = {},
    ): EvaluationItem => ({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
      relevanceScore: 2,
      reason: 'Test reason',
      ...overrides,
    });

    const createRecordWithMetrics = (
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
    ) => {
      const metrics: ReturnType<
        typeof CourseRetrievalMetricsCalculator.calculateMetrics
      > = {
        totalCourses: 10,
        meanRelevanceScore: 2.0,
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
            count: 5,
            macroAverageRate: 50,
            microAverageRate: 50,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 5,
            macroAverageRate: 50,
            microAverageRate: 50,
            label: 'highly_relevant',
          },
        },
        ndcg: {
          proxy: { at5: 0.75, at10: 0.85, at15: 0.88, atAll: 0.9 },
          ideal: { at5: 0.75, at10: 0.85, at15: 0.88, atAll: 0.9 },
        },
        precision: {
          at5: { threshold1: 0.8, threshold2: 0.6, threshold3: 0.3 },
          at10: { threshold1: 0.75, threshold2: 0.5, threshold3: 0.25 },
          at15: { threshold1: 0.73, threshold2: 0.45, threshold3: 0.23 },
          atAll: { threshold1: 0.7, threshold2: 0.4, threshold3: 0.2 },
        },
        ...overrides,
      };

      return {
        question: 'Test question',
        skill: 'Test skill',
        retrievedCount: metrics.totalCourses,
        evaluations: Array.from({ length: metrics.totalCourses }, () =>
          createEvaluationItem(),
        ),
        metrics,
        llmModel: 'gpt-4',
        llmProvider: 'OpenAI',
        inputTokens: 100,
        outputTokens: 50,
      };
    };

    it('should average metrics across multiple samples correctly', () => {
      // Arrange
      const records = [
        createRecordWithMetrics({
          meanRelevanceScore: 2.0,
          perClassDistribution: {
            score0: {
              relevanceScore: 0,
              count: 1,
              macroAverageRate: 10,
              microAverageRate: 10,
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
              count: 5,
              macroAverageRate: 50,
              microAverageRate: 50,
              label: 'fairly_relevant',
            },
            score3: {
              relevanceScore: 3,
              count: 5,
              macroAverageRate: 50,
              microAverageRate: 50,
              label: 'highly_relevant',
            },
          },
          ndcg: {
            proxy: { at5: 0.7, at10: 0.8, at15: 0.83, atAll: 0.85 },
            ideal: { at5: 0.7, at10: 0.8, at15: 0.83, atAll: 0.85 },
          },
          precision: {
            at5: { threshold1: 0.7, threshold2: 0.5, threshold3: 0.2 },
            at10: { threshold1: 0.65, threshold2: 0.4, threshold3: 0.18 },
            at15: { threshold1: 0.63, threshold2: 0.35, threshold3: 0.17 },
            atAll: { threshold1: 0.6, threshold2: 0.3, threshold3: 0.15 },
          },
        }),
        createRecordWithMetrics({
          meanRelevanceScore: 1.0,
          perClassDistribution: {
            score0: {
              relevanceScore: 0,
              count: 3,
              macroAverageRate: 30,
              microAverageRate: 30,
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
              count: 3,
              macroAverageRate: 30,
              microAverageRate: 30,
              label: 'fairly_relevant',
            },
            score3: {
              relevanceScore: 3,
              count: 2,
              macroAverageRate: 20,
              microAverageRate: 20,
              label: 'highly_relevant',
            },
          },
          ndcg: {
            proxy: { at5: 0.5, at10: 0.6, at15: 0.63, atAll: 0.65 },
            ideal: { at5: 0.5, at10: 0.6, at15: 0.63, atAll: 0.65 },
          },
          precision: {
            at5: { threshold1: 0.5, threshold2: 0.3, threshold3: 0.15 },
            at10: { threshold1: 0.45, threshold2: 0.2, threshold3: 0.1 },
            at15: { threshold1: 0.43, threshold2: 0.15, threshold3: 0.08 },
            atAll: { threshold1: 0.4, threshold2: 0.1, threshold3: 0.05 },
          },
        }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert - means should be calculated correctly
      expect(result.meanRelevanceScore).toBeCloseTo(1.5); // (2.0 + 1.0) / 2
      expect(result.perClassDistribution.score3.macroAverageRate).toBeCloseTo(
        35,
      ); // (50 + 20) / 2
      expect(result.perClassDistribution.score0.macroAverageRate).toBeCloseTo(
        20,
      ); // (10 + 30) / 2
      expect(result.ndcg.proxy.at5).toBeCloseTo(0.6); // (0.7 + 0.5) / 2
      expect(result.ndcg.proxy.at10).toBeCloseTo(0.7); // (0.8 + 0.6) / 2
      // Precision is now an object with threshold1, threshold2, threshold3
      expect(result.precision.at5.threshold2).toBeCloseTo(0.4); // (0.5 + 0.3) / 2
    });

    it('should handle single sample', () => {
      // Arrange
      const records = [
        createRecordWithMetrics({
          meanRelevanceScore: 2.5,
          perClassDistribution: {
            score0: {
              relevanceScore: 0,
              count: 1,
              macroAverageRate: 10,
              microAverageRate: 10,
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
              count: 3,
              macroAverageRate: 30,
              microAverageRate: 30,
              label: 'fairly_relevant',
            },
            score3: {
              relevanceScore: 3,
              count: 6,
              macroAverageRate: 60,
              microAverageRate: 60,
              label: 'highly_relevant',
            },
          },
        }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert
      expect(result.meanRelevanceScore).toBe(2.5);
      expect(result.perClassDistribution.score3.macroAverageRate).toBe(60);
      expect(result.perClassDistribution.score0.macroAverageRate).toBe(10);
    });

    it('should handle empty samples array', () => {
      // Arrange
      const records: Array<{
        metrics: ReturnType<
          typeof CourseRetrievalMetricsCalculator.calculateMetrics
        >;
      }> = [];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert - should return zeroed metrics
      expect(result.totalCourses).toBe(0);
      expect(result.meanRelevanceScore).toBe(0);
      expect(result.perClassDistribution.score3.count).toBe(0);
      expect(result.perClassDistribution.score3.macroAverageRate).toBe(0);
      expect(result.perClassDistribution.score0.count).toBe(0);
      expect(result.perClassDistribution.score0.macroAverageRate).toBe(0);
      expect(result.ndcg.proxy.at5).toBe(0);
      // Precision is now an object with threshold1, threshold2, threshold3
      expect(result.precision.at5.threshold1).toBe(0);
      expect(result.precision.at5.threshold2).toBe(0);
      expect(result.precision.at5.threshold3).toBe(0);
    });

    it('should sum counts across samples', () => {
      // Arrange
      const records = [
        createRecordWithMetrics({
          totalCourses: 5,
          perClassDistribution: {
            score0: {
              relevanceScore: 0,
              count: 1,
              macroAverageRate: 20,
              microAverageRate: 20,
              label: 'irrelevant',
            },
            score1: {
              relevanceScore: 1,
              count: 1,
              macroAverageRate: 20,
              microAverageRate: 20,
              label: 'slightly_relevant',
            },
            score2: {
              relevanceScore: 2,
              count: 1,
              macroAverageRate: 20,
              microAverageRate: 20,
              label: 'fairly_relevant',
            },
            score3: {
              relevanceScore: 3,
              count: 2,
              macroAverageRate: 40,
              microAverageRate: 40,
              label: 'highly_relevant',
            },
          },
        }),
        createRecordWithMetrics({
          totalCourses: 8,
          perClassDistribution: {
            score0: {
              relevanceScore: 0,
              count: 2,
              macroAverageRate: 25,
              microAverageRate: 25,
              label: 'irrelevant',
            },
            score1: {
              relevanceScore: 1,
              count: 1,
              macroAverageRate: 12.5,
              microAverageRate: 12.5,
              label: 'slightly_relevant',
            },
            score2: {
              relevanceScore: 2,
              count: 2,
              macroAverageRate: 25,
              microAverageRate: 25,
              label: 'fairly_relevant',
            },
            score3: {
              relevanceScore: 3,
              count: 3,
              macroAverageRate: 37.5,
              microAverageRate: 37.5,
              label: 'highly_relevant',
            },
          },
        }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert
      expect(result.totalCourses).toBe(13); // 5 + 8
      expect(result.perClassDistribution.score3.count).toBe(5); // 2 + 3
      expect(result.perClassDistribution.score0.count).toBe(3); // 1 + 2
    });

    it('should calculate combined per-class distribution correctly', () => {
      // Arrange
      const records = [
        createRecordWithMetrics({
          totalCourses: 5,
          perClassDistribution: {
            score0: {
              relevanceScore: 0,
              count: 1,
              macroAverageRate: 20,
              microAverageRate: 20,
              label: 'irrelevant',
            },
            score1: {
              relevanceScore: 1,
              count: 1,
              macroAverageRate: 20,
              microAverageRate: 20,
              label: 'slightly_relevant',
            },
            score2: {
              relevanceScore: 2,
              count: 2,
              macroAverageRate: 40,
              microAverageRate: 40,
              label: 'fairly_relevant',
            },
            score3: {
              relevanceScore: 3,
              count: 1,
              macroAverageRate: 20,
              microAverageRate: 20,
              label: 'highly_relevant',
            },
          },
        }),
        createRecordWithMetrics({
          totalCourses: 3,
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
              count: 1,
              macroAverageRate: 33.33,
              microAverageRate: 33.33,
              label: 'slightly_relevant',
            },
            score2: {
              relevanceScore: 2,
              count: 1,
              macroAverageRate: 33.33,
              microAverageRate: 33.33,
              label: 'fairly_relevant',
            },
            score3: {
              relevanceScore: 3,
              count: 1,
              macroAverageRate: 33.33,
              microAverageRate: 33.33,
              label: 'highly_relevant',
            },
          },
        }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert
      expect(result.totalCourses).toBe(8); // 5 + 3
      expect(result.perClassDistribution.score0.count).toBe(1); // 1 + 0
      expect(result.perClassDistribution.score1.count).toBe(2); // 1 + 1
      expect(result.perClassDistribution.score2.count).toBe(3); // 2 + 1
      expect(result.perClassDistribution.score3.count).toBe(2); // 1 + 1
    });
  });
});
