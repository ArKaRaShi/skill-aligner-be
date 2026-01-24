import { describe, expect, it } from '@jest/globals';

import { LlmCourseEvaluationItem } from '../../schemas/schema';
import type {
  EvaluationItem,
  RetrievalScoreDistribution,
} from '../../types/course-retrieval.types';
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
      expect(result.totalCourses).toBe(0);
      expect(result.averageRelevance).toBe(0);
      expect(result.highlyRelevantCount).toBe(0);
      expect(result.highlyRelevantRate).toBe(0);
      expect(result.irrelevantCount).toBe(0);
      expect(result.irrelevantRate).toBe(0);
      // NDCG and precision should also be zeroed
      expect(result.ndcg.at5).toBe(0);
      expect(result.precision.at5).toBe(0);
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
        averageRelevance: number;
        scoreDistribution: RetrievalScoreDistribution[];
        highlyRelevantCount: number;
        highlyRelevantRate: number;
        irrelevantCount: number;
        irrelevantRate: number;
        ndcg: { at5: number; at10: number; atAll: number };
        precision: { at5: number; at10: number; atAll: number };
      }> = {},
    ) => {
      const metrics: ReturnType<
        typeof CourseRetrievalMetricsCalculator.calculateMetrics
      > = {
        totalCourses: 10,
        averageRelevance: 2.0,
        scoreDistribution: [
          { relevanceScore: 0, count: 0, percentage: 0 },
          { relevanceScore: 1, count: 0, percentage: 0 },
          { relevanceScore: 2, count: 5, percentage: 50 },
          { relevanceScore: 3, count: 5, percentage: 50 },
        ],
        highlyRelevantCount: 5,
        highlyRelevantRate: 50,
        irrelevantCount: 0,
        irrelevantRate: 0,
        ndcg: { at5: 0.75, at10: 0.85, atAll: 0.9 },
        precision: { at5: 0.6, at10: 0.5, atAll: 0.4 },
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
          averageRelevance: 2.0,
          highlyRelevantRate: 50,
          irrelevantRate: 10,
          ndcg: { at5: 0.7, at10: 0.8, atAll: 0.85 },
          precision: { at5: 0.5, at10: 0.4, atAll: 0.3 },
        }),
        createRecordWithMetrics({
          averageRelevance: 1.0,
          highlyRelevantRate: 20,
          irrelevantRate: 30,
          ndcg: { at5: 0.5, at10: 0.6, atAll: 0.65 },
          precision: { at5: 0.3, at10: 0.2, atAll: 0.1 },
        }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert - means should be calculated correctly
      expect(result.averageRelevance).toBeCloseTo(1.5); // (2.0 + 1.0) / 2
      expect(result.highlyRelevantRate).toBeCloseTo(35); // (50 + 20) / 2
      expect(result.irrelevantRate).toBeCloseTo(20); // (10 + 30) / 2
      expect(result.ndcg.at5).toBeCloseTo(0.6); // (0.7 + 0.5) / 2
      expect(result.ndcg.at10).toBeCloseTo(0.7); // (0.8 + 0.6) / 2
      expect(result.precision.at5).toBeCloseTo(0.4); // (0.5 + 0.3) / 2
    });

    it('should handle single sample', () => {
      // Arrange
      const records = [
        createRecordWithMetrics({
          averageRelevance: 2.5,
          highlyRelevantRate: 60,
          irrelevantRate: 10,
        }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert
      expect(result.averageRelevance).toBe(2.5);
      expect(result.highlyRelevantRate).toBe(60);
      expect(result.irrelevantRate).toBe(10);
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
      expect(result.averageRelevance).toBe(0);
      expect(result.highlyRelevantCount).toBe(0);
      expect(result.highlyRelevantRate).toBe(0);
      expect(result.irrelevantCount).toBe(0);
      expect(result.irrelevantRate).toBe(0);
      expect(result.ndcg.at5).toBe(0);
      expect(result.precision.at5).toBe(0);
    });

    it('should sum counts across samples', () => {
      // Arrange
      const records = [
        createRecordWithMetrics({
          totalCourses: 5,
          highlyRelevantCount: 2,
          irrelevantCount: 1,
        }),
        createRecordWithMetrics({
          totalCourses: 8,
          highlyRelevantCount: 3,
          irrelevantCount: 2,
        }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert
      expect(result.totalCourses).toBe(13); // 5 + 8
      expect(result.highlyRelevantCount).toBe(5); // 2 + 3
      expect(result.irrelevantCount).toBe(3); // 1 + 2
    });

    it('should calculate combined score distribution correctly', () => {
      // Arrange
      const records = [
        createRecordWithMetrics({
          totalCourses: 5,
          scoreDistribution: [
            { relevanceScore: 0, count: 1, percentage: 20 },
            { relevanceScore: 1, count: 1, percentage: 20 },
            { relevanceScore: 2, count: 2, percentage: 40 },
            { relevanceScore: 3, count: 1, percentage: 20 },
          ],
        }),
        createRecordWithMetrics({
          totalCourses: 3,
          scoreDistribution: [
            { relevanceScore: 0, count: 0, percentage: 0 },
            { relevanceScore: 1, count: 1, percentage: 33.33 },
            { relevanceScore: 2, count: 1, percentage: 33.33 },
            { relevanceScore: 3, count: 1, percentage: 33.33 },
          ],
        }),
      ];

      // Act
      const result =
        CourseRetrievalMetricsCalculator.calculateMeanMetrics(records);

      // Assert
      expect(result.totalCourses).toBe(8); // 5 + 3
      expect(result.scoreDistribution).toEqual([
        { relevanceScore: 0, count: 1, percentage: 12.5 }, // 1/8
        { relevanceScore: 1, count: 2, percentage: 25 }, // 2/8
        { relevanceScore: 2, count: 3, percentage: 37.5 }, // 3/8
        { relevanceScore: 3, count: 2, percentage: 25 }, // 2/8
      ]);
    });
  });

  describe('buildEnrichedIterationMetrics', () => {
    const createMetrics = (
      overrides: Partial<{
        totalCourses: number;
        averageRelevance: number;
        highlyRelevantCount: number;
        highlyRelevantRate: number;
        irrelevantCount: number;
        irrelevantRate: number;
        ndcg: { at5: number; at10: number; atAll: number };
        precision: { at5: number; at10: number; atAll: number };
      }> = {},
    ): ReturnType<
      typeof CourseRetrievalMetricsCalculator.calculateMetrics
    > => ({
      totalCourses: 100,
      averageRelevance: 1.5,
      scoreDistribution: [
        { relevanceScore: 0, count: 20, percentage: 20 },
        { relevanceScore: 1, count: 30, percentage: 30 },
        { relevanceScore: 2, count: 30, percentage: 30 },
        { relevanceScore: 3, count: 20, percentage: 20 },
      ],
      highlyRelevantCount: 20,
      highlyRelevantRate: 20,
      irrelevantCount: 20,
      irrelevantRate: 20,
      ndcg: { at5: 0.65, at10: 0.75, atAll: 0.8 },
      precision: { at5: 0.45, at10: 0.4, atAll: 0.35 },
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

    it('should enrich averageRelevance with context', () => {
      // Arrange
      const metrics = createMetrics({
        totalCourses: 100,
        averageRelevance: 1.5,
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 10,
          iterationNumber: 1,
        });

      // Assert
      expect(result.averageRelevance.value).toBe(1.5);
      expect(result.averageRelevance.totalRelevanceSum).toBe(150); // 1.5 * 100
      expect(result.averageRelevance.totalCourses).toBe(100);
      expect(result.averageRelevance.description).toContain('1.5');
      expect(result.averageRelevance.description).toContain('100');
    });

    it('should enrich highlyRelevantRate with context', () => {
      // Arrange
      const metrics = createMetrics({
        highlyRelevantCount: 15,
        highlyRelevantRate: 15, // 15%
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
      expect(result.highlyRelevantRate.value).toBeCloseTo(15);
      expect(result.highlyRelevantRate.count).toBe(15);
      expect(result.highlyRelevantRate.totalCount).toBe(100);
      expect(result.highlyRelevantRate.description).toContain('15');
      expect(result.highlyRelevantRate.description).toContain('15.0%');
    });

    it('should enrich irrelevantRate with context', () => {
      // Arrange
      const metrics = createMetrics({
        irrelevantCount: 25,
        irrelevantRate: 25, // 25%
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
      expect(result.irrelevantRate.value).toBeCloseTo(25);
      expect(result.irrelevantRate.count).toBe(25);
      expect(result.irrelevantRate.totalCount).toBe(100);
      expect(result.irrelevantRate.description).toContain('25');
    });

    it('should enrich NDCG metrics with descriptions', () => {
      // Arrange
      const metrics = createMetrics({
        ndcg: { at5: 0.92, at10: 0.85, atAll: 0.88 },
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 10,
          iterationNumber: 1,
        });

      // Assert
      expect(result.ndcg.at5.value).toBeCloseTo(0.92);
      expect(result.ndcg.at5.description).toContain('0.92');
      expect(result.ndcg.at5.description).toContain('excellent');
      expect(result.ndcg.at10.description).toContain('0.85');
      expect(result.ndcg.at10.description).toContain('good');
      expect(result.ndcg.atAll.description).toContain('0.88');
    });

    it('should enrich Precision metrics with context', () => {
      // Arrange
      const metrics = createMetrics({
        precision: { at5: 0.6, at10: 0.5, atAll: 0.4 },
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
      expect(result.precision.at5.value).toBeCloseTo(0.6);
      expect(result.precision.at5.description).toContain('60.0%');
      expect(result.precision.at10.description).toContain('50.0%');
      expect(result.precision.atAll.description).toContain('40.0%');
    });

    it('should assign correct quality rating for NDCG values', () => {
      // Test different NDCG values
      const testCases = [
        { ndcgValue: 0.95, expectedQuality: 'excellent' },
        { ndcgValue: 0.85, expectedQuality: 'good' },
        { ndcgValue: 0.75, expectedQuality: 'reasonable' },
        { ndcgValue: 0.65, expectedQuality: 'fair' },
        { ndcgValue: 0.55, expectedQuality: 'poor' },
        { ndcgValue: 0.45, expectedQuality: 'very poor' },
      ];

      for (const { ndcgValue, expectedQuality } of testCases) {
        const metrics = createMetrics({
          ndcg: { at5: ndcgValue, at10: ndcgValue, atAll: ndcgValue },
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
        averageRelevance: 3.0,
        highlyRelevantRate: 100,
        irrelevantRate: 0,
        ndcg: { at5: 1.0, at10: 1.0, atAll: 1.0 },
        precision: { at5: 1.0, at10: 1.0, atAll: 1.0 },
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
      expect(result.averageRelevance.value).toBe(3.0);
      expect(result.ndcg.at5.description).toContain('excellent');
      expect(result.precision.at5.value).toBe(1.0);
    });

    it('should handle zero scores', () => {
      // Arrange
      const metrics = createMetrics({
        averageRelevance: 0,
        highlyRelevantRate: 0,
        irrelevantRate: 100,
        ndcg: { at5: 0, at10: 0, atAll: 0 },
        precision: { at5: 0, at10: 0, atAll: 0 },
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
      expect(result.ndcg.at5.description).toContain('very poor');
      expect(result.precision.at5.value).toBe(0);
    });

    it('should format numbers to 2 decimal places', () => {
      // Arrange
      const metrics = createMetrics({
        averageRelevance: 1.333333,
        highlyRelevantRate: 14.285714,
        ndcg: { at5: 0.691588, at10: 0.823588, atAll: 0.830118 },
      });

      // Act
      const result =
        CourseRetrievalMetricsCalculator.buildEnrichedIterationMetrics({
          metrics,
          sampleCount: 17,
          iterationNumber: 1,
        });

      // Assert - should be rounded to 2 decimal places
      expect(result.averageRelevance.value).toBeCloseTo(1.33);
      expect(result.highlyRelevantRate.value).toBeCloseTo(14.29);
      expect(result.ndcg.at5.value).toBeCloseTo(0.69);
      expect(result.ndcg.at10.value).toBeCloseTo(0.82);
    });
  });
});
