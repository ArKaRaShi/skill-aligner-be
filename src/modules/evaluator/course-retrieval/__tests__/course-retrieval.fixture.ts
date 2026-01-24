import type { Identifier } from 'src/shared/contracts/types/identifier';

import type { LearningOutcome } from 'src/modules/course/types/course-learning-outcome-v2.type';
import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';
import type { CourseRetrievalTestSetSerialized } from 'src/modules/evaluator/shared/services/test-set.types';

import type {
  CourseInfo,
  EvaluationItem,
  RetrievalPerformanceMetrics,
  RetrievalScoreDistribution,
} from '../types/course-retrieval.types';

// ============================================================================
// CONSTANTS
// ============================================================================

export const MOCK_TIMESTAMP = '2023-01-01T00:00:00.000Z' as const;
export const MOCK_TEST_SET_NAME = 'test-set-v1' as const;
export const MOCK_ITERATION_NUMBER = 1;

// ============================================================================
// TYPE EXPORTS (for convenience)
// ============================================================================

export type {
  CourseInfo,
  EvaluationItem,
  RetrievalPerformanceMetrics,
  RetrievalScoreDistribution,
};

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Helper to create a branded Identifier from a string
 */
export const createId = (str: string): Identifier => str as Identifier;

/**
 * Creates a mock LearningOutcome
 */
export const createMockLearningOutcome = (
  overrides: Partial<LearningOutcome> = {},
): LearningOutcome => ({
  loId: createId('lo-123'),
  originalName: 'Understand programming concepts',
  cleanedName: 'understand programming concepts',
  skipEmbedding: false,
  hasEmbedding768: true,
  hasEmbedding1536: false,
  createdAt: new Date(MOCK_TIMESTAMP),
  updatedAt: new Date(MOCK_TIMESTAMP),
  ...overrides,
});

/**
 * Creates a mock CourseInfo
 */
export const createMockCourseInfo = (
  overrides: Partial<CourseInfo> = {},
): CourseInfo => ({
  subjectCode: 'CS101',
  subjectName: 'Introduction to Python',
  cleanedLearningOutcomes: ['Learn Python basics', 'Understand variables'],
  ...overrides,
});

/**
 * Creates a mock CourseWithLearningOutcomeV2Match
 */
export const createMockCourseWithLOMatch = (
  overrides: Partial<CourseWithLearningOutcomeV2Match> = {},
): CourseWithLearningOutcomeV2Match => {
  const lo1 = createMockLearningOutcome({ loId: createId('lo-1') });
  const lo2 = createMockLearningOutcome({ loId: createId('lo-2') });

  return {
    id: createId('course-123'),
    campusId: createId('campus-1'),
    facultyId: createId('faculty-1'),
    subjectCode: 'CS101',
    subjectName: 'Introduction to Python',
    isGenEd: false,
    matchedLearningOutcomes: [],
    remainingLearningOutcomes: [],
    allLearningOutcomes: [lo1, lo2],
    courseOfferings: [],
    courseClickLogs: [],
    metadata: null,
    createdAt: new Date(MOCK_TIMESTAMP),
    updatedAt: new Date(MOCK_TIMESTAMP),
    ...overrides,
  };
};

/**
 * Creates a mock EvaluationItem (single-score model)
 */
export const createMockEvaluationItem = (
  overrides: Partial<EvaluationItem> = {},
): EvaluationItem => ({
  subjectCode: 'CS101',
  subjectName: 'Introduction to Python',
  relevanceScore: 2,
  reason: 'Good match for the skill',
  ...overrides,
});

/**
 * Creates a mock RetrievalScoreDistribution
 */
export const createMockRetrievalScoreDistribution = (
  overrides: Partial<RetrievalScoreDistribution> = {},
): RetrievalScoreDistribution => ({
  relevanceScore: 2,
  count: 5,
  percentage: 50,
  ...overrides,
});

/**
 * Creates a mock RetrievalPerformanceMetrics
 */
export const createMockRetrievalPerformanceMetrics = (
  overrides: Partial<RetrievalPerformanceMetrics> = {},
): RetrievalPerformanceMetrics => ({
  totalCourses: 5,
  averageRelevance: 2.0,
  scoreDistribution: [
    createMockRetrievalScoreDistribution({
      relevanceScore: 2,
      count: 5,
      percentage: 100,
    }),
  ],
  highlyRelevantCount: 0,
  highlyRelevantRate: 0,
  irrelevantCount: 0,
  irrelevantRate: 0,
  ndcg: { at5: 0.8, at10: 0.75, atAll: 0.7 },
  precision: { at5: 0.6, at10: 0.5, atAll: 0.4 },
  ...overrides,
});

/**
 * Creates a mock CourseRetrievalTestSetSerialized
 */
export const createMockCourseRetrievalTestSetSerialized = (
  overrides: Partial<CourseRetrievalTestSetSerialized> = {},
): CourseRetrievalTestSetSerialized => {
  const course1 = createMockCourseWithLOMatch({
    subjectCode: 'CS101',
    subjectName: 'Introduction to Python',
  });
  const course2 = createMockCourseWithLOMatch({
    subjectCode: 'CS201',
    subjectName: 'Advanced Python',
  });

  return {
    queryLogId: 'query-log-123',
    question: 'How do I learn Python programming?',
    skills: ['python programming', 'data analysis'],
    skillCoursesMap: {
      'python programming': [course1, course2],
      'data analysis': [course1],
    },
    duration: null,
    ...overrides,
  };
};

// ============================================================================
// PRE-CONFIGURED TEST SCENARIOS
// ============================================================================

/**
 * Pre-configured mock scenarios for common test cases
 */
export const MOCK_SCENARIOS = {
  /**
   * Single skill with uniform scores (all 2s)
   */
  singleSkillUniformScores: {
    evaluations: [
      createMockEvaluationItem({
        subjectCode: 'CS101',
        relevanceScore: 2,
      }),
      createMockEvaluationItem({
        subjectCode: 'CS102',
        relevanceScore: 2,
      }),
      createMockEvaluationItem({
        subjectCode: 'CS103',
        relevanceScore: 2,
      }),
    ],
    expectedMetrics: {
      totalCourses: 3,
      averageRelevance: 2,
      scoreDistribution: [
        { relevanceScore: 2, count: 3, percentage: 100 },
      ] as RetrievalScoreDistribution[],
      highlyRelevantCount: 0,
      highlyRelevantRate: 0,
      irrelevantCount: 0,
      irrelevantRate: 0,
    } as RetrievalPerformanceMetrics,
  },

  /**
   * Single skill with mixed scores (0, 1, 2, 3)
   */
  singleSkillMixedScores: {
    evaluations: [
      createMockEvaluationItem({
        subjectCode: 'CS201',
        relevanceScore: 3,
      }),
      createMockEvaluationItem({
        subjectCode: 'CS202',
        relevanceScore: 2,
      }),
      createMockEvaluationItem({
        subjectCode: 'CS203',
        relevanceScore: 1,
      }),
      createMockEvaluationItem({
        subjectCode: 'CS204',
        relevanceScore: 0,
      }),
    ],
    expectedMetrics: {
      totalCourses: 4,
      averageRelevance: 1.5,
      scoreDistribution: [
        { relevanceScore: 0, count: 1, percentage: 25 },
        { relevanceScore: 1, count: 1, percentage: 25 },
        { relevanceScore: 2, count: 1, percentage: 25 },
        { relevanceScore: 3, count: 1, percentage: 25 },
      ] as RetrievalScoreDistribution[],
      highlyRelevantCount: 1,
      highlyRelevantRate: 25,
      irrelevantCount: 1,
      irrelevantRate: 25,
    } as RetrievalPerformanceMetrics,
  },

  /**
   * Perfect retriever (all scores = 3)
   */
  perfectRetriever: {
    evaluations: Array.from({ length: 5 }, () =>
      createMockEvaluationItem({ relevanceScore: 3 }),
    ),
    expectedMetrics: {
      totalCourses: 5,
      averageRelevance: 3,
      highlyRelevantCount: 5,
      highlyRelevantRate: 100,
      irrelevantCount: 0,
      irrelevantRate: 0,
    } as RetrievalPerformanceMetrics,
  },

  /**
   * Poor retriever (all scores = 0)
   */
  poorRetriever: {
    evaluations: Array.from({ length: 3 }, () =>
      createMockEvaluationItem({ relevanceScore: 0 }),
    ),
    expectedMetrics: {
      totalCourses: 3,
      averageRelevance: 0,
      highlyRelevantCount: 0,
      highlyRelevantRate: 0,
      irrelevantCount: 3,
      irrelevantRate: 100,
    } as RetrievalPerformanceMetrics,
  },

  /**
   * Edge case: empty arrays
   */
  emptyArrays: {
    evaluations: [] as EvaluationItem[],
    scores: [] as number[],
  },

  /**
   * Edge case: single item
   */
  singleItem: {
    evaluations: [
      createMockEvaluationItem({
        subjectCode: 'CS101',
        relevanceScore: 2,
      }),
    ],
    expectedMetrics: {
      totalCourses: 1,
      averageRelevance: 2,
      scoreDistribution: [
        { relevanceScore: 2, count: 1, percentage: 100 },
      ] as RetrievalScoreDistribution[],
      highlyRelevantCount: 0,
      highlyRelevantRate: 0,
      irrelevantCount: 0,
      irrelevantRate: 0,
    } as RetrievalPerformanceMetrics,
  },
} as const;
