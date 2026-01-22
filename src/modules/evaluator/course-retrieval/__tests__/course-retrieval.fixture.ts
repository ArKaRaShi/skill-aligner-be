import type { Identifier } from 'src/shared/contracts/types/identifier';

import type { LearningOutcome } from 'src/modules/course/types/course-learning-outcome-v2.type';
import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';
import type { CourseRetrievalTestSetSerialized } from 'src/modules/evaluator/shared/services/test-set.types';

import type {
  AggregateMetrics,
  AveragedMetrics,
  ContextMismatchEntry,
  EnhancedIterationMetrics,
  FinalMetrics,
  SkillMetrics,
  TestCaseMetrics,
} from '../test-sets/test-set.type';
import type {
  CourseInfo,
  EvaluationItem,
  RetrievalPerformanceReport,
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
  AggregateMetrics,
  AveragedMetrics,
  ContextMismatchEntry,
  EnhancedIterationMetrics,
  EvaluationItem,
  FinalMetrics,
  RetrievalPerformanceReport,
  RetrievalScoreDistribution,
  SkillMetrics,
  TestCaseMetrics,
  CourseInfo,
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
 * Creates a mock EvaluationItem
 */
export const createMockEvaluationItem = (
  overrides: Partial<EvaluationItem> = {},
): EvaluationItem => ({
  subjectCode: 'CS101',
  subjectName: 'Introduction to Python',
  skillRelevance: 2,
  skillReason: 'Good match for programming fundamentals',
  contextAlignment: 2,
  contextReason: 'Good alignment with user intent',
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
 * Creates a mock RetrievalPerformanceReport
 */
export const createMockRetrievalPerformanceReport = (
  overrides: Partial<RetrievalPerformanceReport> = {},
): RetrievalPerformanceReport => ({
  averageSkillRelevance: 2.0,
  averageContextAlignment: 2.0,
  alignmentGap: 0,
  contextMismatchRate: 0,
  skillRelevanceDistribution: [
    createMockRetrievalScoreDistribution({
      relevanceScore: 2,
      count: 5,
      percentage: 100,
    }),
  ],
  contextAlignmentDistribution: [
    createMockRetrievalScoreDistribution({
      relevanceScore: 2,
      count: 5,
      percentage: 100,
    }),
  ],
  contextMismatchCourses: [],
  ...overrides,
});

/**
 * Creates a mock SkillMetrics
 */
export const createMockSkillMetrics = (
  overrides: Partial<SkillMetrics> = {},
): SkillMetrics => {
  const evaluations = overrides.evaluations ?? [createMockEvaluationItem()];

  return {
    ...createMockRetrievalPerformanceReport(),
    courseCount: evaluations.length,
    skillName: 'python programming',
    evaluations,
    ...overrides,
  };
};

/**
 * Creates a mock AveragedMetrics
 */
export const createMockAveragedMetrics = (
  overrides: Partial<AveragedMetrics> = {},
): AveragedMetrics => ({
  averageSkillRelevance: 2.0,
  averageContextAlignment: 2.0,
  alignmentGap: 0,
  contextMismatchRate: 0,
  ...overrides,
});

/**
 * Creates a mock TestCaseMetrics
 */
export const createMockTestCaseMetrics = (
  overrides: Partial<TestCaseMetrics> = {},
): TestCaseMetrics => {
  const skillMetrics = overrides.skillMetrics ?? [createMockSkillMetrics()];
  const totalCourses = skillMetrics.reduce((sum, s) => sum + s.courseCount, 0);

  return {
    testCaseId: 'test-case-1',
    question: 'How do I learn Python?',
    totalSkills: skillMetrics.length,
    totalCourses,
    timestamp: MOCK_TIMESTAMP,
    macroAvg: createMockAveragedMetrics(),
    microAvg: createMockAveragedMetrics(),
    pooled: {
      skillRelevanceDistribution: [],
      contextAlignmentDistribution: [],
    },
    skillMetrics,
    ...overrides,
  };
};

/**
 * Creates a mock EnhancedIterationMetrics
 */
export const createMockEnhancedIterationMetrics = (
  overrides: Partial<EnhancedIterationMetrics> = {},
): EnhancedIterationMetrics => {
  const testCaseMetrics = overrides.testCaseMetrics ?? [
    createMockTestCaseMetrics(),
  ];

  return {
    iterationNumber: MOCK_ITERATION_NUMBER,
    totalCases: testCaseMetrics.length,
    totalInputTokens: 1000,
    totalOutputTokens: 500,
    timestamp: MOCK_TIMESTAMP,
    macroAvg: createMockAveragedMetrics(),
    microAvg: createMockAveragedMetrics(),
    pooled: {
      skillRelevanceDistribution: [],
      contextAlignmentDistribution: [],
    },
    totalContextMismatches: 0,
    testCaseMetrics,
    ...overrides,
  };
};

/**
 * Creates a mock ContextMismatchEntry
 */
export const createMockContextMismatchEntry = (
  overrides: Partial<ContextMismatchEntry> = {},
): ContextMismatchEntry => ({
  timestamp: MOCK_TIMESTAMP,
  testCaseId: 'test-case-1',
  question: 'How do I learn Python?',
  skill: 'python programming',
  retrievedCount: 5,
  mismatches: [
    {
      subjectCode: 'CS101',
      subjectName: 'Introduction to Python',
      skillRelevance: 3,
      contextAlignment: 0,
    },
  ],
  iterationNumber: MOCK_ITERATION_NUMBER,
  ...overrides,
});

/**
 * Creates a mock AggregateMetrics
 */
export const createMockAggregateMetrics = (
  overrides: Partial<AggregateMetrics> = {},
): AggregateMetrics => ({
  testSetName: MOCK_TEST_SET_NAME,
  totalIterations: 3,
  testSetSize: 10,
  macro: {
    meanSkillRelevance: 2.5,
    minSkillRelevance: 2.0,
    maxSkillRelevance: 3.0,
    meanContextAlignment: 2.0,
    minContextAlignment: 1.5,
    maxContextAlignment: 2.5,
    meanAlignmentGap: 0.5,
    meanMismatchRate: 20,
  },
  micro: {
    meanSkillRelevance: 2.5,
    minSkillRelevance: 2.0,
    maxSkillRelevance: 3.0,
    meanContextAlignment: 2.0,
    minContextAlignment: 1.5,
    maxContextAlignment: 2.5,
    meanAlignmentGap: 0.5,
    meanMismatchRate: 20,
  },
  iterationMetrics: [],
  timestamp: MOCK_TIMESTAMP,
  ...overrides,
});

/**
 * Creates a mock FinalMetrics
 */
export const createMockFinalMetrics = (
  overrides: Partial<FinalMetrics> = {},
): FinalMetrics => ({
  testSetName: MOCK_TEST_SET_NAME,
  totalIterations: 3,
  testSetSize: 10,
  macroOverall: {
    meanSkillRelevance: 2.5,
    meanContextAlignment: 2.0,
    meanAlignmentGap: 0.5,
    meanMismatchRate: 20,
  },
  microOverall: {
    meanSkillRelevance: 2.5,
    meanContextAlignment: 2.0,
    meanAlignmentGap: 0.5,
    meanMismatchRate: 20,
  },
  iterationMetrics: [],
  timestamp: MOCK_TIMESTAMP,
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
    skillMetrics: createMockSkillMetrics({
      skillName: 'python programming',
      courseCount: 3,
      evaluations: [
        createMockEvaluationItem({
          subjectCode: 'CS101',
          skillRelevance: 2,
          contextAlignment: 2,
        }),
        createMockEvaluationItem({
          subjectCode: 'CS102',
          skillRelevance: 2,
          contextAlignment: 2,
        }),
        createMockEvaluationItem({
          subjectCode: 'CS103',
          skillRelevance: 2,
          contextAlignment: 2,
        }),
      ],
    }),
    expectedMetrics: {
      averageSkillRelevance: 2,
      averageContextAlignment: 2,
      alignmentGap: 0,
    },
  },

  /**
   * Single skill with mixed scores (0, 1, 2, 3)
   */
  singleSkillMixedScores: {
    skillMetrics: createMockSkillMetrics({
      skillName: 'data analysis',
      courseCount: 4,
      evaluations: [
        createMockEvaluationItem({
          subjectCode: 'CS201',
          skillRelevance: 3,
          contextAlignment: 0,
        }),
        createMockEvaluationItem({
          subjectCode: 'CS202',
          skillRelevance: 2,
          contextAlignment: 1,
        }),
        createMockEvaluationItem({
          subjectCode: 'CS203',
          skillRelevance: 1,
          contextAlignment: 2,
        }),
        createMockEvaluationItem({
          subjectCode: 'CS204',
          skillRelevance: 0,
          contextAlignment: 3,
        }),
      ],
    }),
    expectedMetrics: {
      averageSkillRelevance: 1.5,
      averageContextAlignment: 1.5,
      alignmentGap: 0,
    },
  },

  /**
   * Multiple skills with varying course counts (1, 2, 3 courses)
   */
  multipleSkillsVaryingCounts: {
    skillMetrics: [
      createMockSkillMetrics({
        skillName: 'python',
        courseCount: 1,
        evaluations: [
          createMockEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
        ],
      }),
      createMockSkillMetrics({
        skillName: 'java',
        courseCount: 2,
        evaluations: [
          createMockEvaluationItem({ skillRelevance: 3, contextAlignment: 3 }),
          createMockEvaluationItem({ skillRelevance: 3, contextAlignment: 3 }),
        ],
      }),
      createMockSkillMetrics({
        skillName: 'data analysis',
        courseCount: 3,
        evaluations: [
          createMockEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
          createMockEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
          createMockEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
        ],
      }),
    ],
    expectedMacroAvg: {
      averageSkillRelevance: (2 + 3 + 2) / 3,
      averageContextAlignment: (2 + 3 + 2) / 3,
    },
    expectedMicroAvg: {
      averageSkillRelevance: (2 * 1 + 3 * 2 + 2 * 3) / 6,
      averageContextAlignment: (2 * 1 + 3 * 2 + 2 * 3) / 6,
    },
  },

  /**
   * Skills with context mismatches (skill >= 2, context <= 1)
   */
  contextMismatchScenario: {
    skillMetrics: createMockSkillMetrics({
      skillName: 'machine learning',
      courseCount: 5,
      evaluations: [
        // Mismatch: skill=3, context=1
        createMockEvaluationItem({
          subjectCode: 'ML101',
          skillRelevance: 3,
          contextAlignment: 1,
        }),
        // Mismatch: skill=2, context=0
        createMockEvaluationItem({
          subjectCode: 'ML102',
          skillRelevance: 2,
          contextAlignment: 0,
        }),
        // Mismatch: skill=3, context=1
        createMockEvaluationItem({
          subjectCode: 'ML103',
          skillRelevance: 3,
          contextAlignment: 1,
        }),
        // Not mismatch: skill=1, context=0 (skill < 2)
        createMockEvaluationItem({
          subjectCode: 'ML104',
          skillRelevance: 1,
          contextAlignment: 0,
        }),
        // Not mismatch: skill=2, context=2 (context > 1)
        createMockEvaluationItem({
          subjectCode: 'ML105',
          skillRelevance: 2,
          contextAlignment: 2,
        }),
      ],
    }),
    expectedMetrics: {
      contextMismatchCount: 3,
      contextMismatchRate: (3 / 5) * 100,
      averageSkillRelevance: (3 + 2 + 3 + 1 + 2) / 5,
      averageContextAlignment: (1 + 0 + 1 + 0 + 2) / 5,
    },
  },

  /**
   * Perfect retriever (all scores = 3)
   */
  perfectRetriever: {
    skillMetrics: createMockSkillMetrics({
      skillName: 'web development',
      courseCount: 5,
      evaluations: Array.from({ length: 5 }, () =>
        createMockEvaluationItem({ skillRelevance: 3, contextAlignment: 3 }),
      ),
    }),
    expectedMetrics: {
      averageSkillRelevance: 3,
      averageContextAlignment: 3,
      alignmentGap: 0,
      contextMismatchRate: 0,
    },
  },

  /**
   * Poor retriever (all scores = 0)
   */
  poorRetriever: {
    skillMetrics: createMockSkillMetrics({
      skillName: 'cloud computing',
      courseCount: 3,
      evaluations: Array.from({ length: 3 }, () =>
        createMockEvaluationItem({ skillRelevance: 0, contextAlignment: 0 }),
      ),
    }),
    expectedMetrics: {
      averageSkillRelevance: 0,
      averageContextAlignment: 0,
      alignmentGap: 0,
      contextMismatchRate: 0,
    },
  },

  /**
   * Edge case: empty arrays
   */
  emptyArrays: {
    skillMetrics: [] as SkillMetrics[],
    testCaseMetrics: [] as TestCaseMetrics[],
    evaluations: [] as EvaluationItem[],
    scores: [] as number[],
  },

  /**
   * Edge case: single item
   */
  singleItem: {
    skillMetrics: createMockSkillMetrics({
      skillName: 'database design',
      courseCount: 1,
      evaluations: [
        createMockEvaluationItem({ skillRelevance: 2, contextAlignment: 2 }),
      ],
    }),
    testCaseMetrics: createMockTestCaseMetrics({
      totalSkills: 1,
      totalCourses: 1,
      skillMetrics: [
        createMockSkillMetrics({
          skillName: 'database design',
          courseCount: 1,
          evaluations: [
            createMockEvaluationItem({
              skillRelevance: 2,
              contextAlignment: 2,
            }),
          ],
        }),
      ],
    }),
  },
} as const;
