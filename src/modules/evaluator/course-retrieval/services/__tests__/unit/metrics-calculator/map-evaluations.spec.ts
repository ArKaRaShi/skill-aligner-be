import { describe, expect, it } from '@jest/globals';

import { LlmCourseEvaluationItem } from '../../../../schemas/schema';
import { CourseRetrievalMetricsCalculator } from '../../../course-retrieval-metrics-calculator.service';

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
});
