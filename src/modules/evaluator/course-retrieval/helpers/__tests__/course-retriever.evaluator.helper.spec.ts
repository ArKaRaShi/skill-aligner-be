import { LlmCourseEvaluationItem } from '../../schemas/schema';
import { CourseInfo, EvaluationItem } from '../../types/type';
import { CourseRetrieverEvaluatorHelper } from '../course-retriever.evaluator.helper';

// Mock the toon-format library since Jest doesn't handle ESM modules well in unit tests
jest.mock('@toon-format/toon', () => ({
  encode: jest.fn((data: unknown) => JSON.stringify(data)),
}));

describe('CourseRetrieverEvaluatorHelper', () => {
  describe('mapEvaluations', () => {
    const createLlmEvaluationItem = (
      overrides: Partial<LlmCourseEvaluationItem> = {},
    ): LlmCourseEvaluationItem => ({
      course_name: 'Introduction to Python',
      course_code: 'CS101',
      skill_relevance_score: 2,
      context_alignment_score: 3,
      skill_reason: 'Strong match for programming fundamentals',
      context_reason: 'Excellent alignment with user goals',
      ...overrides,
    });

    it('should map single LLM evaluation item to domain model', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createLlmEvaluationItem(),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.mapEvaluations(llmEvaluations);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        courseCode: 'CS101',
        courseName: 'Introduction to Python',
        skillRelevance: 2,
        skillReason: 'Strong match for programming fundamentals',
        contextAlignment: 3,
        contextReason: 'Excellent alignment with user goals',
      });
    });

    it('should map multiple LLM evaluation items correctly', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createLlmEvaluationItem({
          course_name: 'Python Basics',
          course_code: 'CS101',
          skill_relevance_score: 2,
          context_alignment_score: 3,
          skill_reason: 'Good skill match',
          context_reason: 'Good context fit',
        }),
        createLlmEvaluationItem({
          course_name: 'Advanced Java',
          course_code: 'CS201',
          skill_relevance_score: 1,
          context_alignment_score: 0,
          skill_reason: 'Partial skill match',
          context_reason: 'Poor context fit',
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.mapEvaluations(llmEvaluations);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        courseCode: 'CS101',
        courseName: 'Python Basics',
        skillRelevance: 2,
        skillReason: 'Good skill match',
        contextAlignment: 3,
        contextReason: 'Good context fit',
      });
      expect(result[1]).toEqual({
        courseCode: 'CS201',
        courseName: 'Advanced Java',
        skillRelevance: 1,
        skillReason: 'Partial skill match',
        contextAlignment: 0,
        contextReason: 'Poor context fit',
      });
    });

    it('should map all valid scores (0, 1, 2, 3) correctly', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [0, 1, 2, 3].map(
        (score) =>
          createLlmEvaluationItem({
            course_code: `CS${score}01`,
            skill_relevance_score: score as 0 | 1 | 2 | 3,
            context_alignment_score: (3 - score) as 0 | 1 | 2 | 3,
          }),
      );

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.mapEvaluations(llmEvaluations);

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0].skillRelevance).toBe(0);
      expect(result[0].contextAlignment).toBe(3);
      expect(result[1].skillRelevance).toBe(1);
      expect(result[1].contextAlignment).toBe(2);
      expect(result[2].skillRelevance).toBe(2);
      expect(result[2].contextAlignment).toBe(1);
      expect(result[3].skillRelevance).toBe(3);
      expect(result[3].contextAlignment).toBe(0);
    });

    it('should handle empty array', () => {
      // Arrange
      const llmEvaluations: LlmCourseEvaluationItem[] = [];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.mapEvaluations(llmEvaluations);

      // Assert
      expect(result).toEqual([]);
    });

    it('should preserve all string properties including long multi-line reasons', () => {
      // Arrange
      const longReason =
        'This is a long reason that spans multiple lines.\n' +
        'It contains detailed explanations about the course relevance.\n' +
        'The reason helps understand the scoring decision.';
      const llmEvaluations: LlmCourseEvaluationItem[] = [
        createLlmEvaluationItem({
          skill_reason: longReason,
          context_reason: longReason,
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.mapEvaluations(llmEvaluations);

      // Assert
      expect(result[0].skillReason).toBe(longReason);
      expect(result[0].contextReason).toBe(longReason);
    });
  });

  describe('calculateMetrics', () => {
    const createEvaluationItem = (
      overrides: Partial<EvaluationItem> = {},
    ): EvaluationItem => ({
      courseCode: 'CS101',
      courseName: 'Introduction to Python',
      skillRelevance: 2,
      skillReason: 'Test reason',
      contextAlignment: 2,
      contextReason: 'Test reason',
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
        averageSkillRelevance: 0,
        averageContextAlignment: 0,
        alignmentGap: 0,
        contextMismatchRate: 0,
        skillRelevanceDistribution: [],
        contextAlignmentDistribution: [],
        contextMismatchCourses: [],
      });
    });

    it('should calculate averages correctly for uniform scores', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
        createEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
        createEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert
      expect(result.averageSkillRelevance).toBe(2);
      expect(result.averageContextAlignment).toBe(2);
      expect(result.alignmentGap).toBe(0);
    });

    it('should calculate averages correctly for mixed scores', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ skillRelevance: 3, contextAlignment: 1 }),
        createEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
        createEvaluationItem({ skillRelevance: 1, contextAlignment: 3 }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert: (3+2+1)/3 = 2, (1+2+3)/3 = 2
      expect(result.averageSkillRelevance).toBeCloseTo(2.0);
      expect(result.averageContextAlignment).toBeCloseTo(2.0);
      expect(result.alignmentGap).toBeCloseTo(0.0);
    });

    it('should calculate alignment gap correctly when skill > context', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ skillRelevance: 3, contextAlignment: 1 }),
        createEvaluationItem({ skillRelevance: 2, contextAlignment: 0 }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert: avg skill = 2.5, avg context = 0.5, gap = 2.0
      expect(result.averageSkillRelevance).toBe(2.5);
      expect(result.averageContextAlignment).toBe(0.5);
      expect(result.alignmentGap).toBe(2.0);
    });

    it('should calculate alignment gap correctly when context > skill', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ skillRelevance: 1, contextAlignment: 3 }),
        createEvaluationItem({ skillRelevance: 0, contextAlignment: 2 }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert: avg skill = 0.5, avg context = 2.5, gap = -2.0
      expect(result.averageSkillRelevance).toBe(0.5);
      expect(result.averageContextAlignment).toBe(2.5);
      expect(result.alignmentGap).toBe(-2.0);
    });

    it('should detect context mismatches (skill >= 2 AND context <= 1)', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({
          courseCode: 'CS101',
          skillRelevance: 2, // >= 2
          contextAlignment: 0, // <= 1 -> MISMATCH
        }),
        createEvaluationItem({
          courseCode: 'CS201',
          skillRelevance: 3, // >= 2
          contextAlignment: 1, // <= 1 -> MISMATCH
        }),
        createEvaluationItem({
          courseCode: 'CS301',
          skillRelevance: 1, // < 2 -> NOT mismatch (even though context <= 1)
          contextAlignment: 1,
        }),
        createEvaluationItem({
          courseCode: 'CS401',
          skillRelevance: 2,
          contextAlignment: 2, // > 1 -> NOT mismatch
        }),
        createEvaluationItem({
          courseCode: 'CS501',
          skillRelevance: 0, // < 2 -> NOT mismatch (even though context <= 1)
          contextAlignment: 0,
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert
      expect(result.contextMismatchCourses).toHaveLength(2);
      expect(result.contextMismatchCourses.map((c) => c.courseCode)).toEqual(
        expect.arrayContaining(['CS101', 'CS201']),
      );
      expect(result.contextMismatchRate).toBe((2 / 5) * 100); // 40%
    });

    it('should calculate context mismatch rate as 0 when no mismatches', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ skillRelevance: 3, contextAlignment: 3 }),
        createEvaluationItem({ skillRelevance: 0, contextAlignment: 0 }),
        createEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert
      expect(result.contextMismatchCourses).toHaveLength(0);
      expect(result.contextMismatchRate).toBe(0);
    });

    it('should calculate score distributions correctly', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ skillRelevance: 3, contextAlignment: 0 }),
        createEvaluationItem({ skillRelevance: 3, contextAlignment: 1 }),
        createEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
        createEvaluationItem({ skillRelevance: 1, contextAlignment: 3 }),
        createEvaluationItem({ skillRelevance: 0, contextAlignment: 3 }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert: Skill distribution has 4 unique values (3,2,1,0)
      expect(result.skillRelevanceDistribution).toHaveLength(4);
      expect(result.skillRelevanceDistribution).toContainEqual({
        relevanceScore: 3,
        count: 2,
        percentage: (2 / 5) * 100,
      });
      expect(result.skillRelevanceDistribution).toContainEqual({
        relevanceScore: 2,
        count: 1,
        percentage: (1 / 5) * 100,
      });
      expect(result.skillRelevanceDistribution).toContainEqual({
        relevanceScore: 1,
        count: 1,
        percentage: (1 / 5) * 100,
      });
      expect(result.skillRelevanceDistribution).toContainEqual({
        relevanceScore: 0,
        count: 1,
        percentage: (1 / 5) * 100,
      });

      // Assert: Context distribution also has 4 unique values (0,1,2,3)
      expect(result.contextAlignmentDistribution).toHaveLength(4);
      expect(result.contextAlignmentDistribution).toContainEqual({
        relevanceScore: 3,
        count: 2,
        percentage: (2 / 5) * 100,
      });
      expect(result.contextAlignmentDistribution).toContainEqual({
        relevanceScore: 0,
        count: 1,
        percentage: (1 / 5) * 100,
      });
      expect(result.contextAlignmentDistribution).toContainEqual({
        relevanceScore: 1,
        count: 1,
        percentage: (1 / 5) * 100,
      });
      expect(result.contextAlignmentDistribution).toContainEqual({
        relevanceScore: 2,
        count: 1,
        percentage: (1 / 5) * 100,
      });
    });

    it('should handle single evaluation item', () => {
      // Arrange
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert
      expect(result.averageSkillRelevance).toBe(2);
      expect(result.averageContextAlignment).toBe(2);
      expect(result.alignmentGap).toBe(0);
      // No mismatch: skill=2 >=2 but context=2 > 1
      expect(result.contextMismatchRate).toBe(0);
      expect(result.skillRelevanceDistribution).toEqual([
        { relevanceScore: 2, count: 1, percentage: 100 },
      ]);
      expect(result.contextAlignmentDistribution).toEqual([
        { relevanceScore: 2, count: 1, percentage: 100 },
      ]);
    });

    it('should calculate realistic scenario with perfect retriever', () => {
      // Arrange: All high skill and high context scores
      const evaluations: EvaluationItem[] = Array.from({ length: 10 }, () =>
        createEvaluationItem({ skillRelevance: 3, contextAlignment: 3 }),
      );

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert
      expect(result.averageSkillRelevance).toBe(3);
      expect(result.averageContextAlignment).toBe(3);
      expect(result.alignmentGap).toBe(0);
      expect(result.contextMismatchRate).toBe(0);
      expect(result.skillRelevanceDistribution).toEqual([
        { relevanceScore: 3, count: 10, percentage: 100 },
      ]);
      expect(result.contextAlignmentDistribution).toEqual([
        { relevanceScore: 3, count: 10, percentage: 100 },
      ]);
    });

    it('should calculate realistic scenario with poor context awareness', () => {
      // Arrange: High skill scores but low context scores (context mismatch)
      const evaluations: EvaluationItem[] = [
        createEvaluationItem({ skillRelevance: 3, contextAlignment: 1 }),
        createEvaluationItem({ skillRelevance: 3, contextAlignment: 0 }),
        createEvaluationItem({ skillRelevance: 2, contextAlignment: 1 }),
        createEvaluationItem({ skillRelevance: 3, contextAlignment: 1 }),
        createEvaluationItem({ skillRelevance: 2, contextAlignment: 0 }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.calculateMetrics(evaluations);

      // Assert
      expect(result.averageSkillRelevance).toBeCloseTo(2.6);
      expect(result.averageContextAlignment).toBeCloseTo(0.6);
      expect(result.alignmentGap).toBeCloseTo(2.0);
      expect(result.contextMismatchCourses).toHaveLength(5); // All 5 are mismatches
      expect(result.contextMismatchRate).toBe(100);
    });
  });

  describe('calculateDistribution', () => {
    it('should calculate distribution for unique scores', () => {
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
      expect(result).toHaveLength(3);
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
      expect(result).toHaveLength(1);
      expect(result).toEqual([
        {
          relevanceScore: 2,
          count: 5,
          percentage: 100,
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
      expect(result).toEqual([]);
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
      expect(result).toEqual([
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
      expect(result).toHaveLength(3);
      result.forEach((item) => {
        expect(item.count).toBe(1);
        expect(item.percentage).toBeCloseTo(33.33, 2);
      });
    });

    it('should preserve order based on score appearance', () => {
      // Arrange: Scores in descending order
      const scores = [3, 2, 1, 0];
      const total = 4;

      // Act
      const result = CourseRetrieverEvaluatorHelper.calculateDistribution(
        scores,
        total,
      );

      // Assert: Result should maintain insertion order from Map
      expect(result[0].relevanceScore).toBe(3);
      expect(result[1].relevanceScore).toBe(2);
      expect(result[2].relevanceScore).toBe(1);
      expect(result[3].relevanceScore).toBe(0);
    });
  });

  describe('buildRetrievedCoursesContext', () => {
    const createCourseInfo = (
      overrides: Partial<CourseInfo> = {},
    ): CourseInfo => ({
      courseCode: 'CS101',
      courseName: 'Introduction to Python',
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
      // Verify it contains course information (toon format encodes to string)
      expect(result).toContain('CS101');
      expect(result).toContain('Introduction to Python');
    });

    it('should build context for multiple courses', () => {
      // Arrange
      const courses: CourseInfo[] = [
        createCourseInfo({
          courseCode: 'CS101',
          courseName: 'Python Basics',
          cleanedLearningOutcomes: ['Learn syntax'],
        }),
        createCourseInfo({
          courseCode: 'CS201',
          courseName: 'Java Advanced',
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
    });

    it('should handle special characters in course names and outcomes', () => {
      // Arrange
      const courses: CourseInfo[] = [
        createCourseInfo({
          courseName: 'C++: Advanced Templates & Metaprogramming',
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
          courseCode: 'CS101',
          courseName: 'Test Course',
          cleanedLearningOutcomes: ['Outcome 1'],
        }),
      ];

      // Act
      const result =
        CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(courses);

      // Assert: The helper transforms to snake_case before encoding
      // With mocked JSON.stringify, we can verify the transformation happened
      const parsed = JSON.parse(result);
      expect(parsed[0]).toHaveProperty('course_code', 'CS101');
      expect(parsed[0]).toHaveProperty('course_name', 'Test Course');
      expect(parsed[0]).toHaveProperty('learning_outcomes');
      expect(parsed[0].learning_outcomes).toEqual(['Outcome 1']);
    });
  });
});
