import { describe, expect, it } from '@jest/globals';

import { LlmCourseEvaluationItem } from '../../schemas/schema';
import type { EvaluationItem } from '../../types/course-retrieval.types';
import { CourseRetrievalMetricsCalculator } from '../course-retrieval-metrics-calculator.service';

describe('CourseRetrievalMetricsCalculator', () => {
  describe('mapEvaluations', () => {
    const createLlmEvaluationItem = (
      overrides: Partial<LlmCourseEvaluationItem> = {},
    ): LlmCourseEvaluationItem => ({
      code: 'CS101',
      score: 2,
      reason: 'Good match for the skill',
      ...overrides,
    });

    const createCourseInfo = (
      overrides: Partial<{ subjectCode: string; subjectName: string }> = {},
    ) => ({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
      ...overrides,
    });

    it('should map single LLM evaluation item to domain model', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createLlmEvaluationItem(),
      ];
      const courses = [createCourseInfo()];

      // Act
      const result = CourseRetrievalMetricsCalculator.mapEvaluations(
        llmEvaluations,
        courses,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        subjectCode: 'CS101',
        subjectName: 'Introduction to Python',
        relevanceScore: 2,
        reason: 'Good match for the skill',
      });
    });

    it('should map multiple LLM evaluation items correctly', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createLlmEvaluationItem({
          code: 'CS101',
          score: 2,
          reason: 'Good skill match',
        }),
        createLlmEvaluationItem({
          code: 'CS201',
          score: 1,
          reason: 'Partial skill match',
        }),
      ];
      const courses = [
        createCourseInfo({
          subjectCode: 'CS101',
          subjectName: 'Python Basics',
        }),
        createCourseInfo({
          subjectCode: 'CS201',
          subjectName: 'Advanced Java',
        }),
      ];

      // Act
      const result = CourseRetrievalMetricsCalculator.mapEvaluations(
        llmEvaluations,
        courses,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        subjectCode: 'CS101',
        subjectName: 'Python Basics',
        relevanceScore: 2,
        reason: 'Good skill match',
      });
      expect(result[1]).toEqual({
        subjectCode: 'CS201',
        subjectName: 'Advanced Java',
        relevanceScore: 1,
        reason: 'Partial skill match',
      });
    });

    it('should map all valid scores (0, 1, 2, 3) correctly', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [0, 1, 2, 3].map(
        (score) =>
          createLlmEvaluationItem({
            code: `CS${score}01`,
            score: score as 0 | 1 | 2 | 3,
          }),
      );
      const courses = [0, 1, 2, 3].map((score) =>
        createCourseInfo({
          subjectCode: `CS${score}01`,
          subjectName: `Course ${score}`,
        }),
      );

      // Act
      const result = CourseRetrievalMetricsCalculator.mapEvaluations(
        llmEvaluations,
        courses,
      );

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0].relevanceScore).toBe(0);
      expect(result[1].relevanceScore).toBe(1);
      expect(result[2].relevanceScore).toBe(2);
      expect(result[3].relevanceScore).toBe(3);
    });

    it('should handle empty array', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [];
      const courses = [];

      // Act
      const result = CourseRetrievalMetricsCalculator.mapEvaluations(
        llmEvaluations,
        courses,
      );

      // Assert
      expect(result).toEqual([]);
    });

    it('should fallback to code when course name not found in map', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createLlmEvaluationItem({ code: 'CS999' }),
      ];
      const courses = [createCourseInfo()]; // CS101, not CS999

      // Act
      const result = CourseRetrievalMetricsCalculator.mapEvaluations(
        llmEvaluations,
        courses,
      );

      // Assert
      expect(result[0].subjectCode).toBe('CS999');
      expect(result[0].subjectName).toBe('CS999'); // Fallback to code
    });

    it('should preserve long multi-line reasons', () => {
      // Arrange
      const longReason =
        'This is a long reason that spans multiple lines.\n' +
        'It contains detailed explanations about the course relevance.\n' +
        'The reason helps understand the scoring decision.';
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createLlmEvaluationItem({ reason: longReason }),
      ];
      const courses = [createCourseInfo()];

      // Act
      const result = CourseRetrievalMetricsCalculator.mapEvaluations(
        llmEvaluations,
        courses,
      );

      // Assert
      expect(result[0].reason).toBe(longReason);
    });
  });

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
      expect(result).toEqual({
        totalCourses: 0,
        averageRelevance: 0,
        scoreDistribution: [
          { relevanceScore: 0, count: 0, percentage: 0 },
          { relevanceScore: 1, count: 0, percentage: 0 },
          { relevanceScore: 2, count: 0, percentage: 0 },
          { relevanceScore: 3, count: 0, percentage: 0 },
        ],
        highlyRelevantCount: 0,
        highlyRelevantRate: 0,
        irrelevantCount: 0,
        irrelevantRate: 0,
      });
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
      expect(result.averageRelevance).toBe(2);
      expect(result.totalCourses).toBe(3);
      expect(result.scoreDistribution).toEqual([
        { relevanceScore: 0, count: 0, percentage: 0 },
        { relevanceScore: 1, count: 0, percentage: 0 },
        { relevanceScore: 2, count: 3, percentage: 100 },
        { relevanceScore: 3, count: 0, percentage: 0 },
      ]);
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
      expect(result.averageRelevance).toBeCloseTo(2.0);
      expect(result.totalCourses).toBe(3);
      expect(result.highlyRelevantCount).toBe(1);
      expect(result.highlyRelevantRate).toBeCloseTo(33.33, 1);
      expect(result.irrelevantCount).toBe(0);
      expect(result.irrelevantRate).toBe(0);
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
      expect(result.highlyRelevantCount).toBe(2);
      expect(result.highlyRelevantRate).toBe(50); // 2/4 = 50%
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
      expect(result.irrelevantCount).toBe(2);
      expect(result.irrelevantRate).toBe(50); // 2/4 = 50%
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
      expect(result.scoreDistribution).toEqual([
        { relevanceScore: 0, count: 1, percentage: 20 },
        { relevanceScore: 1, count: 1, percentage: 20 },
        { relevanceScore: 2, count: 1, percentage: 20 },
        { relevanceScore: 3, count: 2, percentage: 40 },
      ]);
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
      expect(result.averageRelevance).toBe(2);
      expect(result.highlyRelevantCount).toBe(0);
      expect(result.highlyRelevantRate).toBe(0);
      expect(result.irrelevantCount).toBe(0);
      expect(result.irrelevantRate).toBe(0);
      expect(result.scoreDistribution).toEqual([
        { relevanceScore: 0, count: 0, percentage: 0 },
        { relevanceScore: 1, count: 0, percentage: 0 },
        { relevanceScore: 2, count: 1, percentage: 100 },
        { relevanceScore: 3, count: 0, percentage: 0 },
      ]);
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
      expect(result.averageRelevance).toBe(3);
      expect(result.highlyRelevantCount).toBe(10);
      expect(result.highlyRelevantRate).toBe(100);
      expect(result.irrelevantCount).toBe(0);
      expect(result.irrelevantRate).toBe(0);
      expect(result.scoreDistribution).toEqual([
        { relevanceScore: 0, count: 0, percentage: 0 },
        { relevanceScore: 1, count: 0, percentage: 0 },
        { relevanceScore: 2, count: 0, percentage: 0 },
        { relevanceScore: 3, count: 10, percentage: 100 },
      ]);
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
      expect(result.averageRelevance).toBeCloseTo(0.8); // (0+0+1+1+2)/5
      expect(result.highlyRelevantCount).toBe(0);
      expect(result.highlyRelevantRate).toBe(0);
      expect(result.irrelevantCount).toBe(2);
      expect(result.irrelevantRate).toBe(40); // 2/5 = 40%
    });
  });
});
