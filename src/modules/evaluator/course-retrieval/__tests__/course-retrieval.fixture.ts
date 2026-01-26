import type { Identifier } from 'src/shared/contracts/types/identifier';

import type { LearningOutcome } from 'src/modules/course/types/course-learning-outcome-v2.type';
import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';
import type { CourseRetrievalTestSetSerialized } from 'src/modules/evaluator/shared/services/test-set.types';

import type {
  CourseInfo,
  EvaluationItem,
  RetrievalPerformanceMetrics,
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

export type { CourseInfo, EvaluationItem, RetrievalPerformanceMetrics };

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
 * Creates a mock RetrievalPerformanceMetrics
 */
export const createMockRetrievalPerformanceMetrics = (
  overrides: Partial<RetrievalPerformanceMetrics> = {},
): RetrievalPerformanceMetrics => ({
  totalCourses: 5,
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
      macroAverageRate: 100,
      microAverageRate: 100,
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
    proxy: { at5: 0.8, at10: 0.75, at15: 0.73, atAll: 0.7 },
    ideal: { at5: 0.6, at10: 0.55, at15: 0.53, atAll: 0.5 },
  },
  precision: {
    at5: { threshold1: 0.8, threshold2: 0.6, threshold3: 0.3 },
    at10: { threshold1: 0.75, threshold2: 0.5, threshold3: 0.25 },
    at15: { threshold1: 0.73, threshold2: 0.47, threshold3: 0.23 },
    atAll: { threshold1: 0.7, threshold2: 0.4, threshold3: 0.2 },
  },
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
      meanRelevanceScore: 2,
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
          count: 3,
          macroAverageRate: 100,
          microAverageRate: 100,
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
      meanRelevanceScore: 1.5,
      perClassDistribution: {
        score0: {
          relevanceScore: 0,
          count: 1,
          macroAverageRate: 25,
          microAverageRate: 25,
          label: 'irrelevant',
        },
        score1: {
          relevanceScore: 1,
          count: 1,
          macroAverageRate: 25,
          microAverageRate: 25,
          label: 'slightly_relevant',
        },
        score2: {
          relevanceScore: 2,
          count: 1,
          macroAverageRate: 25,
          microAverageRate: 25,
          label: 'fairly_relevant',
        },
        score3: {
          relevanceScore: 3,
          count: 1,
          macroAverageRate: 25,
          microAverageRate: 25,
          label: 'highly_relevant',
        },
      },
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
      meanRelevanceScore: 3,
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
          count: 5,
          macroAverageRate: 100,
          microAverageRate: 100,
          label: 'highly_relevant',
        },
      },
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
      meanRelevanceScore: 0,
      perClassDistribution: {
        score0: {
          relevanceScore: 0,
          count: 3,
          macroAverageRate: 100,
          microAverageRate: 100,
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
      meanRelevanceScore: 2,
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
          count: 1,
          macroAverageRate: 100,
          microAverageRate: 100,
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
    } as RetrievalPerformanceMetrics,
  },
} as const;
