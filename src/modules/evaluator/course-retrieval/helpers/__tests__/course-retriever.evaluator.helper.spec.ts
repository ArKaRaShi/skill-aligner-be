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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

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
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert
      expect(result.totalCourses).toBe(5);
      expect(result.averageRelevance).toBeCloseTo(0.8); // (0+0+1+1+2)/5
      expect(result.highlyRelevantCount).toBe(0);
      expect(result.highlyRelevantRate).toBe(0);
      expect(result.irrelevantCount).toBe(2);
      expect(result.irrelevantRate).toBe(40); // 2/5 = 40%
    });
  });

  describe('calculateDistribution', () => {
    it('should calculate distribution for all scores (0-3)', () => {
      // Arrange
      const scores = [0, 1, 2, 3];
      const total = 4;

      // Act
      const result = CourseRetrieverEvaluatorHelper.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toHaveLength(4);
      expect(result).toContainEqual({
        relevanceScore: 0,
        count: 1,
        percentage: 25,
      });
      expect(result).toContainEqual({
        relevanceScore: 1,
        count: 1,
        percentage: 25,
      });
      expect(result).toContainEqual({
        relevanceScore: 2,
        count: 1,
        percentage: 25,
      });
      expect(result).toContainEqual({
        relevanceScore: 3,
        count: 1,
        percentage: 25,
      });
    });

    it('should calculate distribution with repeated scores', () => {
      // Arrange
      const scores = [3, 3, 3, 1, 1, 0];
      const total = 6;

      // Act
      const result = CourseRetrieverEvaluatorHelper.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toHaveLength(4); // Always returns 0-3
      expect(result).toContainEqual({
        relevanceScore: 3,
        count: 3,
        percentage: 50,
      });
      expect(result).toContainEqual({
        relevanceScore: 1,
        count: 2,
        percentage: (2 / 6) * 100,
      });
      expect(result).toContainEqual({
        relevanceScore: 0,
        count: 1,
        percentage: (1 / 6) * 100,
      });
      expect(result).toContainEqual({
        relevanceScore: 2,
        count: 0,
        percentage: 0,
      });
    });

    it('should handle all identical scores', () => {
      // Arrange
      const scores = [2, 2, 2, 2, 2];
      const total = 5;

      // Act
      const result = CourseRetrieverEvaluatorHelper.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toHaveLength(4); // Always returns 0-3
      expect(result).toEqual([
        {
          relevanceScore: 0,
          count: 0,
          percentage: 0,
        },
        {
          relevanceScore: 1,
          count: 0,
          percentage: 0,
        },
        {
          relevanceScore: 2,
          count: 5,
          percentage: 100,
        },
        {
          relevanceScore: 3,
          count: 0,
          percentage: 0,
        },
      ]);
    });

    it('should handle empty scores array', () => {
      // Arrange
      const scores: number[] = [];
      const total = 0;

      // Act
      const result = CourseRetrieverEvaluatorHelper.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toHaveLength(4); // Always returns 0-3 initialized
      expect(result).toEqual([
        { relevanceScore: 0, count: 0, percentage: 0 },
        { relevanceScore: 1, count: 0, percentage: 0 },
        { relevanceScore: 2, count: 0, percentage: 0 },
        { relevanceScore: 3, count: 0, percentage: 0 },
      ]);
    });

    it('should handle single score', () => {
      // Arrange
      const scores = [3];
      const total = 1;

      // Act
      const result = CourseRetrieverEvaluatorHelper.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toHaveLength(4);
      expect(result).toEqual([
        { relevanceScore: 0, count: 0, percentage: 0 },
        { relevanceScore: 1, count: 0, percentage: 0 },
        { relevanceScore: 2, count: 0, percentage: 0 },
        {
          relevanceScore: 3,
          count: 1,
          percentage: 100,
        },
      ]);
    });

    it('should calculate percentages with floating point precision', () => {
      // Arrange
      const scores = [3, 2, 1];
      const total = 3;

      // Act
      const result = CourseRetrieverEvaluatorHelper.calculateDistribution(
        scores,
        total,
      );

      // Assert
      expect(result).toHaveLength(4);
      expect(result.find((r) => r.relevanceScore === 3)?.percentage).toBe(
        (1 / 3) * 100,
      );
      expect(result.find((r) => r.relevanceScore === 2)?.percentage).toBe(
        (1 / 3) * 100,
      );
      expect(result.find((r) => r.relevanceScore === 1)?.percentage).toBe(
        (1 / 3) * 100,
      );
      expect(result.find((r) => r.relevanceScore === 0)?.count).toBe(0);
    });

    it('should always return scores in order 0, 1, 2, 3', () => {
      // Arrange: Scores in random order
      const scores = [3, 0, 2, 1];
      const total = 4;

      // Act
      const result = CourseRetrieverEvaluatorHelper.calculateDistribution(
        scores,
        total,
      );

      // Assert: Result should always be in order 0, 1, 2, 3
      expect(result[0].relevanceScore).toBe(0);
      expect(result[1].relevanceScore).toBe(1);
      expect(result[2].relevanceScore).toBe(2);
      expect(result[3].relevanceScore).toBe(3);
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
