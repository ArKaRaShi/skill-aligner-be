import { describe, expect, it } from '@jest/globals';

import type { EvaluationItem } from '../../../../types/course-retrieval.types';
import { CourseRetrievalMetricsCalculator } from '../../../course-retrieval-metrics-calculator.service';

describe('CourseRetrievalMetricsCalculator', () => {
  describe('calculateMetrics', () => {
    const createEvaluationItem = (
      overrides: Partial<EvaluationItem> = {},
    ): EvaluationItem => ({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
      relevanceScore: 2,
      reason: 'Test reason',
      ...overrides,
    });

    it('should return zeroed metrics for empty evaluations array', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.totalCourses).toBe(0);
      expect(result.meanRelevanceScore).toBe(0);
      expect(result.perClassDistribution.score0.count).toBe(0);
      expect(result.perClassDistribution.score3.count).toBe(0);
      // NDCG and precision should also be zeroed (use threshold2 for standard metric)
      expect(result.ndcg.proxy.at5).toBe(0);
      expect(result.precision.at5.threshold2).toBe(0);
    });

    it('should calculate averages correctly for uniform scores', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ relevanceScore: 2 }),
        createEvaluationItem({ relevanceScore: 2 }),
        createEvaluationItem({ relevanceScore: 2 }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.meanRelevanceScore).toBe(2);
      expect(result.totalCourses).toBe(3);
      expect(result.perClassDistribution.score2.count).toBe(3);
      expect(result.perClassDistribution.score2.macroAverageRate).toBe(100);
    });

    it('should calculate averages correctly for mixed scores', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ relevanceScore: 3 }),
        createEvaluationItem({ relevanceScore: 2 }),
        createEvaluationItem({ relevanceScore: 1 }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);

      // Assert: (3+2+1)/3 = 2
      expect(result.meanRelevanceScore).toBeCloseTo(2.0);
      expect(result.totalCourses).toBe(3);
      expect(result.perClassDistribution.score3.count).toBe(1);
      expect(result.perClassDistribution.score3.macroAverageRate).toBeCloseTo(
        33.33,
        1,
      );
      expect(result.perClassDistribution.score0.count).toBe(0);
      expect(result.perClassDistribution.score0.macroAverageRate).toBe(0);
    });

    it('should count highly relevant courses (score 3)', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ relevanceScore: 3 }),
        createEvaluationItem({ relevanceScore: 3 }),
        createEvaluationItem({ relevanceScore: 2 }),
        createEvaluationItem({ relevanceScore: 1 }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.perClassDistribution.score3.count).toBe(2);
      expect(result.perClassDistribution.score3.macroAverageRate).toBe(50); // 2/4 = 50%
    });

    it('should count irrelevant courses (score 0)', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ relevanceScore: 0 }),
        createEvaluationItem({ relevanceScore: 0 }),
        createEvaluationItem({ relevanceScore: 1 }),
        createEvaluationItem({ relevanceScore: 2 }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.perClassDistribution.score0.count).toBe(2);
      expect(result.perClassDistribution.score0.macroAverageRate).toBe(50); // 2/4 = 50%
    });

    it('should calculate score distribution correctly', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ relevanceScore: 0 }),
        createEvaluationItem({ relevanceScore: 1 }),
        createEvaluationItem({ relevanceScore: 2 }),
        createEvaluationItem({ relevanceScore: 3 }),
        createEvaluationItem({ relevanceScore: 3 }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.perClassDistribution.score0).toMatchObject({
        relevanceScore: 0,
        count: 1,
        macroAverageRate: 20,
        microAverageRate: 20,
        label: 'irrelevant',
      });
      expect(result.perClassDistribution.score1).toMatchObject({
        relevanceScore: 1,
        count: 1,
        macroAverageRate: 20,
        microAverageRate: 20,
        label: 'slightly_relevant',
      });
      expect(result.perClassDistribution.score2).toMatchObject({
        relevanceScore: 2,
        count: 1,
        macroAverageRate: 20,
        microAverageRate: 20,
        label: 'fairly_relevant',
      });
      expect(result.perClassDistribution.score3).toMatchObject({
        relevanceScore: 3,
        count: 2,
        macroAverageRate: 40,
        microAverageRate: 40,
        label: 'highly_relevant',
      });
    });

    it('should handle single evaluation item', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ relevanceScore: 2 }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.totalCourses).toBe(1);
      expect(result.meanRelevanceScore).toBe(2);
      expect(result.perClassDistribution.score3.count).toBe(0);
      expect(result.perClassDistribution.score3.macroAverageRate).toBe(0);
      expect(result.perClassDistribution.score0.count).toBe(0);
      expect(result.perClassDistribution.score0.macroAverageRate).toBe(0);
      expect(result.perClassDistribution.score2.count).toBe(1);
      expect(result.perClassDistribution.score2.macroAverageRate).toBe(100);
    });

    it('should calculate realistic scenario with perfect retriever', () => {
      // Arrange: All high scores
      const evaluations: EvaluationItem[] = Array.from({ length: 10 }, () =>
        createEvaluationItem({ relevanceScore: 3 }),
      );

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.totalCourses).toBe(10);
      expect(result.meanRelevanceScore).toBe(3);
      expect(result.perClassDistribution.score3.count).toBe(10);
      expect(result.perClassDistribution.score3.macroAverageRate).toBe(100);
      expect(result.perClassDistribution.score0.count).toBe(0);
      expect(result.perClassDistribution.score0.macroAverageRate).toBe(0);
      expect(result.perClassDistribution.score2.count).toBe(0);
      expect(result.perClassDistribution.score2.macroAverageRate).toBe(0);
    });

    it('should calculate realistic scenario with poor retriever', () => {
      // Arrange: Mostly low scores
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ relevanceScore: 0 }),
        createEvaluationItem({ relevanceScore: 0 }),
        createEvaluationItem({ relevanceScore: 1 }),
        createEvaluationItem({ relevanceScore: 1 }),
        createEvaluationItem({ relevanceScore: 2 }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.totalCourses).toBe(5);
      expect(result.meanRelevanceScore).toBeCloseTo(0.8); // (0+0+1+1+2)/5
      expect(result.perClassDistribution.score3.count).toBe(0);
      expect(result.perClassDistribution.score3.macroAverageRate).toBe(0);
      expect(result.perClassDistribution.score0.count).toBe(2);
      expect(result.perClassDistribution.score0.macroAverageRate).toBe(40); // 2/5 = 40%
    });
  });
});
