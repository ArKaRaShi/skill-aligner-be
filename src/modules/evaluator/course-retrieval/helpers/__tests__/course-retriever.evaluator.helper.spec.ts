import { LlmCourseEvaluationItem } from '../../schemas/schema';
import { CourseInfo, EvaluationItem } from '../../types/course-retrieval.types';
import { CourseRetrieverEvaluatorHelper } from '../course-retriever.evaluator.helper';

describe('CourseRetrieverEvaluatorHelper', () => {
  describe('mapEvaluations', () => {
    const createLlmEvaluationItem = (
      overrides: Partial<LlmCourseEvaluationItem> = {},
    ): LlmCourseEvaluationItem => ({
      code: 'CS101',
      score: 2,
      reason: 'Strong match for programming fundamentals',
      ...overrides,
    });

    const createCourseInfo = (
      overrides: Partial<CourseInfo> = {},
    ): CourseInfo => ({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
      cleanedLearningOutcomes: ['Learn Python basics'],
      ...overrides,
    });

    it('should map single LLM evaluation item to domain model', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createLlmEvaluationItem(),
      ];
      const courses: CourseInfo[] = [createCourseInfo()];

      // Act
      const result = CourseRetrieverEvaluatorHelper.mapEvaluations(
        llmEvaluations,
        courses,
      );

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        subjectCode: 'CS101',
        subjectName: 'Introduction to Python',
        relevanceScore: 2,
        reason: 'Strong match for programming fundamentals',
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
      const courses: CourseInfo[] = [
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
      const result = CourseRetrieverEvaluatorHelper.mapEvaluations(
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
      const courses: CourseInfo[] = [0, 1, 2, 3].map((score) =>
        createCourseInfo({
          subjectCode: `CS${score}01`,
          subjectName: `Course ${score}`,
        }),
      );

      // Act
      const result = CourseRetrieverEvaluatorHelper.mapEvaluations(
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
      const courses: CourseInfo[] = [];

      // Act
      const result = CourseRetrieverEvaluatorHelper.mapEvaluations(
        llmEvaluations,
        courses,
      );

      // Assert
      expect(result).toEqual([]);
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
      const courses: CourseInfo[] = [createCourseInfo()];

      // Act
      const result = CourseRetrieverEvaluatorHelper.mapEvaluations(
        llmEvaluations,
        courses,
      );

      // Assert
      expect(result[0].reason).toBe(longReason);
    });

    it('should fallback to code when course name not found in map', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createLlmEvaluationItem({ code: 'CS999' }),
      ];
      const courses: CourseInfo[] = [createCourseInfo()]; // CS101, not CS999

      // Act
      const result = CourseRetrieverEvaluatorHelper.mapEvaluations(
        llmEvaluations,
        courses,
      );

      // Assert
      expect(result[0].subjectCode).toBe('CS999');
      expect(result[0].subjectName).toBe('CS999'); // Fallback to code
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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert
      expect(result).toEqual({
        totalCourses: 0,
        meanRelevanceScore: 0,
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
        precision: { at5: 0, at10: 0, at15: 0, atAll: 0 },
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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert
      expect(result.perClassDistribution.score0.count).toBe(2);
      expect(result.perClassDistribution.score0.macroAverageRate).toBe(50); // 2/4 = 50%
    });

    it('should calculate per-class distribution correctly', () => {
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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert
      expect(result.totalCourses).toBe(5);
      expect(result.meanRelevanceScore).toBeCloseTo(0.8); // (0+0+1+1+2)/5
      expect(result.perClassDistribution.score3.count).toBe(0);
      expect(result.perClassDistribution.score3.macroAverageRate).toBe(0);
      expect(result.perClassDistribution.score0.count).toBe(2);
      expect(result.perClassDistribution.score0.macroAverageRate).toBe(40); // 2/5 = 40%
    });
  });

  describe('calculatePerClassDistribution', () => {
    it('should calculate distribution for all scores (0-3)', () => {
      // Arrange
      const scores = [0, 1, 2, 3];
      const total = 4;

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculatePerClassDistribution(
          scores,
          total,
        );

      // Assert
      expect(result.score0).toMatchObject({
        relevanceScore: 0,
        count: 1,
        macroAverageRate: 25,
        microAverageRate: 25,
        label: 'irrelevant',
      });
      expect(result.score1).toMatchObject({
        relevanceScore: 1,
        count: 1,
        macroAverageRate: 25,
        microAverageRate: 25,
        label: 'slightly_relevant',
      });
      expect(result.score2).toMatchObject({
        relevanceScore: 2,
        count: 1,
        macroAverageRate: 25,
        microAverageRate: 25,
        label: 'fairly_relevant',
      });
      expect(result.score3).toMatchObject({
        relevanceScore: 3,
        count: 1,
        macroAverageRate: 25,
        microAverageRate: 25,
        label: 'highly_relevant',
      });
    });

    it('should calculate distribution with repeated scores', () => {
      // Arrange
      const scores = [3, 3, 3, 1, 1, 0];
      const total = 6;

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculatePerClassDistribution(
          scores,
          total,
        );

      // Assert
      expect(result.score3).toMatchObject({
        relevanceScore: 3,
        count: 3,
        macroAverageRate: 50,
        microAverageRate: 50,
      });
      expect(result.score1.count).toBe(2);
      expect(result.score1.relevanceScore).toBe(1);
      expect(result.score1.macroAverageRate).toBeCloseTo((2 / 6) * 100, 5);
      expect(result.score1.microAverageRate).toBeCloseTo((2 / 6) * 100, 5);
      expect(result.score0.count).toBe(1);
      expect(result.score0.relevanceScore).toBe(0);
      expect(result.score0.macroAverageRate).toBeCloseTo((1 / 6) * 100, 5);
      expect(result.score0.microAverageRate).toBeCloseTo((1 / 6) * 100, 5);
      expect(result.score2).toMatchObject({
        relevanceScore: 2,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
    });

    it('should handle all identical scores', () => {
      // Arrange
      const scores = [2, 2, 2, 2, 2];
      const total = 5;

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculatePerClassDistribution(
          scores,
          total,
        );

      // Assert
      expect(result.score0).toMatchObject({
        relevanceScore: 0,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
      expect(result.score1).toMatchObject({
        relevanceScore: 1,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
      expect(result.score2).toMatchObject({
        relevanceScore: 2,
        count: 5,
        macroAverageRate: 100,
        microAverageRate: 100,
      });
      expect(result.score3).toMatchObject({
        relevanceScore: 3,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
    });

    it('should handle empty scores array', () => {
      // Arrange
      const scores: number[] = [];
      const total = 0;

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculatePerClassDistribution(
          scores,
          total,
        );

      // Assert
      expect(result.score0).toMatchObject({
        relevanceScore: 0,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
      expect(result.score1).toMatchObject({
        relevanceScore: 1,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
      expect(result.score2).toMatchObject({
        relevanceScore: 2,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
      expect(result.score3).toMatchObject({
        relevanceScore: 3,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
    });

    it('should handle single score', () => {
      // Arrange
      const scores = [3];
      const total = 1;

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculatePerClassDistribution(
          scores,
          total,
        );

      // Assert
      expect(result.score0).toMatchObject({
        relevanceScore: 0,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
      expect(result.score1).toMatchObject({
        relevanceScore: 1,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
      expect(result.score2).toMatchObject({
        relevanceScore: 2,
        count: 0,
        macroAverageRate: 0,
        microAverageRate: 0,
      });
      expect(result.score3).toMatchObject({
        relevanceScore: 3,
        count: 1,
        macroAverageRate: 100,
        microAverageRate: 100,
      });
    });

    it('should calculate percentages with floating point precision', () => {
      // Arrange
      const scores = [3, 2, 1];
      const total = 3;

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculatePerClassDistribution(
          scores,
          total,
        );

      // Assert
      expect(result.score3.macroAverageRate).toBeCloseTo((1 / 3) * 100, 5);
      expect(result.score2.macroAverageRate).toBeCloseTo((1 / 3) * 100, 5);
      expect(result.score1.macroAverageRate).toBeCloseTo((1 / 3) * 100, 5);
      expect(result.score0.count).toBe(0);
    });
  });

  describe('buildRetrievedCoursesContext', () => {
    const createCourseInfo = (
      overrides: Partial<CourseInfo> = {},
    ): CourseInfo => ({
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
      cleanedLearningOutcomes: ['Learn Python basics', 'Understand variables'],
      ...overrides,
    });

    it('should build context for single course', () => {
      // Arrange
      const courses: CourseInfo[] = [createCourseInfo()];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(courses);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Verify it contains course information
      expect(result).toContain('CS101');
      expect(result).toContain('Introduction to Python');
      // Verify it's valid JSON with snake_case keys
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toMatchObject({
        course_code: 'CS101',
        course_name: 'Introduction to Python',
      });
    });

    it('should build context for multiple courses', () => {
      // Arrange
      const courses: CourseInfo[] = [
        createCourseInfo({
          subjectCode: 'CS101',
          subjectName: 'Python Basics',
          cleanedLearningOutcomes: ['Learn syntax'],
        }),
        createCourseInfo({
          subjectCode: 'CS201',
          subjectName: 'Java Advanced',
          cleanedLearningOutcomes: ['OOP concepts'],
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(courses);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('CS101');
      expect(result).toContain('CS201');
      expect(result).toContain('Python Basics');
      expect(result).toContain('Java Advanced');
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(2);
    });

    it('should handle courses with multiple learning outcomes', () => {
      // Arrange
      const courses: CourseInfo[] = [
        createCourseInfo({
          cleanedLearningOutcomes: [
            'Understand programming concepts',
            'Write clean code',
            'Debug applications',
            'Work with databases',
          ],
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(courses);

      // Assert
      expect(result).toContain('Understand programming concepts');
      expect(result).toContain('Write clean code');
      expect(result).toContain('Debug applications');
      expect(result).toContain('Work with databases');
      const parsed = JSON.parse(result);
      expect(parsed[0].learning_outcomes).toHaveLength(4);
    });

    it('should handle courses with empty learning outcomes array', () => {
      // Arrange
      const courses: CourseInfo[] = [
        createCourseInfo({
          cleanedLearningOutcomes: [],
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(courses);

      // Assert
      expect(result).toBeDefined();
      expect(result).toContain('CS101');
      const parsed = JSON.parse(result);
      expect(parsed[0].learning_outcomes).toEqual([]);
    });

    it('should handle empty courses array', () => {
      // Arrange
      const courses: CourseInfo[] = [];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(courses);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed).toEqual([]);
    });

    it('should handle special characters in course names and outcomes', () => {
      // Arrange
      const courses: CourseInfo[] = [
        createCourseInfo({
          subjectName: 'C++: Advanced Templates & Metaprogramming',
          cleanedLearningOutcomes: [
            'Understand template syntax <T>',
            'Learn variadic templates...',
            'Handle "special" characters',
          ],
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(courses);

      // Assert
      expect(result).toContain('C++');
      expect(result).toContain('Templates');
      expect(result).toContain('template syntax');
    });

    it('should handle multi-line learning outcomes', () => {
      // Arrange
      const courses: CourseInfo[] = [
        createCourseInfo({
          cleanedLearningOutcomes: [
            'First outcome line',
            'Second outcome line',
            'Third outcome line',
          ],
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(courses);

      // Assert
      expect(result).toContain('First outcome line');
      expect(result).toContain('Second outcome line');
      expect(result).toContain('Third outcome line');
    });

    it('should transform camelCase to snake_case for LLM consumption', () => {
      // Arrange
      const courses: CourseInfo[] = [
        createCourseInfo({
          subjectCode: 'CS101',
          subjectName: 'Test Course',
          cleanedLearningOutcomes: ['Outcome 1'],
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(courses);

      // Assert: The helper transforms to snake_case for LLM consumption
      const parsed = JSON.parse(result);
      expect(parsed[0]).toHaveProperty('course_code', 'CS101');
      expect(parsed[0]).toHaveProperty('course_name', 'Test Course');
      expect(parsed[0]).toHaveProperty('learning_outcomes');
      expect(parsed[0].learning_outcomes).toEqual(['Outcome 1']);
    });

    it('should produce pretty-printed JSON with 2-space indentation', () => {
      // Arrange
      const courses: CourseInfo[] = [
        createCourseInfo({
          subjectCode: 'CS101',
          subjectName: 'Test Course',
          cleanedLearningOutcomes: ['Outcome 1'],
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(courses);

      // Assert: Verify 2-space indentation
      expect(result).toContain('  "course_code"'); // 2 spaces before key
      expect(result).toContain('    "learning_outcomes"'); // 4 spaces (nested)
    });
  });
});
