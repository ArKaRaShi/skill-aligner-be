import { createMockEvaluationItem } from '../../__tests__/course-retrieval.fixture';
import { LlmCourseEvaluationItem } from '../../schemas/schema';
import { MetricsCalculator } from '../metrics-calculator';

describe('MetricsCalculator', () => {
  describe('mapEvaluations', () => {
    const createMockLlmEvaluationItem = (
      overrides: Partial<LlmCourseEvaluationItem> = {},
    ): LlmCourseEvaluationItem => ({
      course_name: 'Introduction to Python',
      course_code: 'CS101',
      skill_relevance_score: 2,
      context_alignment_score: 2,
      skill_reason: 'Good match for programming fundamentals',
      context_reason: 'Good alignment with user goals',
      ...overrides,
    });

    it('should map LLM evaluation items to domain model', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createMockLlmEvaluationItem(),
      ];

      // Act
      const result = MetricsCalculator.mapEvaluations(llmEvaluations);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        courseCode: 'CS101',
        courseName: 'Introduction to Python',
        skillRelevance: 2,
        skillReason: 'Good match for programming fundamentals',
        contextAlignment: 2,
        contextReason: 'Good alignment with user goals',
      });
    });

    it('should handle empty LLM evaluations array', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [];

      // Act
      const result = MetricsCalculator.mapEvaluations(llmEvaluations);

      // Assert
      expect(result).toEqual([]);
    });

    it('should preserve all score values (0, 1, 2, 3)', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createMockLlmEvaluationItem({
          course_code: 'CS0',
          skill_relevance_score: 0,
          context_alignment_score: 3,
        }),
        createMockLlmEvaluationItem({
          course_code: 'CS1',
          skill_relevance_score: 1,
          context_alignment_score: 2,
        }),
        createMockLlmEvaluationItem({
          course_code: 'CS2',
          skill_relevance_score: 2,
          context_alignment_score: 1,
        }),
        createMockLlmEvaluationItem({
          course_code: 'CS3',
          skill_relevance_score: 3,
          context_alignment_score: 0,
        }),
      ];

      // Act
      const result = MetricsCalculator.mapEvaluations(llmEvaluations);

      // Assert
      expect(result[0].skillRelevance).toBe(0);
      expect(result[0].contextAlignment).toBe(3);
      expect(result[1].skillRelevance).toBe(1);
      expect(result[1].contextAlignment).toBe(2);
      expect(result[2].skillRelevance).toBe(2);
      expect(result[2].contextAlignment).toBe(1);
      expect(result[3].skillRelevance).toBe(3);
      expect(result[3].contextAlignment).toBe(0);
    });
  });

  describe('calculateMetrics', () => {
    it('should return zeroed metrics for empty evaluations', () => {
      // Arrange
      const evaluations: any[] = [];

      // Act
      const result = MetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result).toEqual({
        averageSkillRelevance: 0,
        averageContextAlignment: 0,
        alignmentGap: 0,
        contextMismatchRate: 0,
        skillRelevanceDistribution: [],
        contextAlignmentDistribution: [],
        contextMismatchCourses: [],
      });
    });

    it('should calculate averages correctly', () => {
      // Arrange
      const evaluations = [
        createMockEvaluationItem({ skillRelevance: 3, contextAlignment: 1 }),
        createMockEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
        createMockEvaluationItem({ skillRelevance: 1, contextAlignment: 3 }),
      ];

      // Act
      const result = MetricsCalculator.calculateMetrics(evaluations);

      // Assert: (3+2+1)/3 = 2, (1+2+3)/3 = 2
      expect(result.averageSkillRelevance).toBeCloseTo(2.0);
      expect(result.averageContextAlignment).toBeCloseTo(2.0);
    });

    it('should calculate alignment gap correctly (positive)', () => {
      // Arrange
      const evaluations = [
        createMockEvaluationItem({ skillRelevance: 3, contextAlignment: 1 }),
        createMockEvaluationItem({ skillRelevance: 2, contextAlignment: 0 }),
      ];

      // Act
      const result = MetricsCalculator.calculateMetrics(evaluations);

      // Assert: avg skill = 2.5, avg context = 0.5, gap = 2.0
      expect(result.averageSkillRelevance).toBe(2.5);
      expect(result.averageContextAlignment).toBe(0.5);
      expect(result.alignmentGap).toBe(2.0);
    });

    it('should calculate alignment gap correctly (negative)', () => {
      // Arrange
      const evaluations = [
        createMockEvaluationItem({ skillRelevance: 1, contextAlignment: 3 }),
        createMockEvaluationItem({ skillRelevance: 0, contextAlignment: 2 }),
      ];

      // Act
      const result = MetricsCalculator.calculateMetrics(evaluations);

      // Assert: avg skill = 0.5, avg context = 2.5, gap = -2.0
      expect(result.averageSkillRelevance).toBe(0.5);
      expect(result.averageContextAlignment).toBe(2.5);
      expect(result.alignmentGap).toBe(-2.0);
    });

    it('should detect context mismatches (skill >= 2 AND context <= 1)', () => {
      // Arrange
      const evaluations = [
        createMockEvaluationItem({
          courseCode: 'CS101',
          skillRelevance: 2, // >= 2
          contextAlignment: 0, // <= 1 -> MISMATCH
        }),
        createMockEvaluationItem({
          courseCode: 'CS201',
          skillRelevance: 3, // >= 2
          contextAlignment: 1, // <= 1 -> MISMATCH
        }),
        createMockEvaluationItem({
          courseCode: 'CS301',
          skillRelevance: 1, // < 2 -> NOT mismatch
          contextAlignment: 1,
        }),
        createMockEvaluationItem({
          courseCode: 'CS401',
          skillRelevance: 2,
          contextAlignment: 2, // > 1 -> NOT mismatch
        }),
      ];

      // Act
      const result = MetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.contextMismatchCourses).toHaveLength(2);
      expect(result.contextMismatchCourses.map((c) => c.courseCode)).toEqual(
        expect.arrayContaining(['CS101', 'CS201']),
      );
      expect(result.contextMismatchRate).toBe((2 / 4) * 100); // 50%
    });

    it('should calculate context mismatch rate as percentage', () => {
      // Arrange
      const evaluations = [
        createMockEvaluationItem({ skillRelevance: 3, contextAlignment: 1 }),
        createMockEvaluationItem({ skillRelevance: 3, contextAlignment: 0 }),
        createMockEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
        createMockEvaluationItem({ skillRelevance: 0, contextAlignment: 0 }),
        createMockEvaluationItem({ skillRelevance: 0, contextAlignment: 1 }),
      ];

      // Act
      const result = MetricsCalculator.calculateMetrics(evaluations);

      // Assert: 2 out of 5 are mismatches
      expect(result.contextMismatchRate).toBe((2 / 5) * 100);
    });

    it('should calculate score distributions', () => {
      // Arrange
      const evaluations = [
        createMockEvaluationItem({ skillRelevance: 3, contextAlignment: 0 }),
        createMockEvaluationItem({ skillRelevance: 3, contextAlignment: 1 }),
        createMockEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
        createMockEvaluationItem({ skillRelevance: 1, contextAlignment: 3 }),
        createMockEvaluationItem({ skillRelevance: 0, contextAlignment: 3 }),
      ];

      // Act
      const result = MetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.skillRelevanceDistribution).toHaveLength(4);
      expect(result.contextAlignmentDistribution).toHaveLength(4);

      // Check skill distribution has score 3 with count 2
      expect(result.skillRelevanceDistribution).toContainEqual({
        relevanceScore: 3,
        count: 2,
        percentage: (2 / 5) * 100,
      });
    });

    it('should handle single evaluation', () => {
      // Arrange
      const evaluations = [
        createMockEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
      ];

      // Act
      const result = MetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.averageSkillRelevance).toBe(2);
      expect(result.averageContextAlignment).toBe(2);
      expect(result.alignmentGap).toBe(0);
      expect(result.contextMismatchRate).toBe(0);
    });

    it('should not detect mismatch when skill < 2 even if context <= 1', () => {
      // Arrange
      const evaluations = [
        createMockEvaluationItem({
          courseCode: 'CS101',
          skillRelevance: 1, // < 2 -> NOT mismatch (even though context <= 1)
          contextAlignment: 1,
        }),
        createMockEvaluationItem({
          courseCode: 'CS201',
          skillRelevance: 0, // < 2 -> NOT mismatch
          contextAlignment: 0,
        }),
        createMockEvaluationItem({
          courseCode: 'CS301',
          skillRelevance: 2, // >= 2 AND context <= 1 -> MISMATCH
          contextAlignment: 0,
        }),
      ];

      // Act
      const result = MetricsCalculator.calculateMetrics(evaluations);

      // Assert
      expect(result.contextMismatchCourses).toHaveLength(1);
      expect(result.contextMismatchCourses[0].courseCode).toBe('CS301');
      expect(result.contextMismatchRate).toBe((1 / 3) * 100);
    });
  });
});
