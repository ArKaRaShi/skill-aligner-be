import { Identifier } from 'src/shared/contracts/types/identifier';

import type {
  LearningOutcome,
  MatchedLearningOutcome,
} from 'src/modules/course/types/course-learning-outcome-v2.type';
import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';
import type {
  AggregatedCourseSkills,
  CourseWithLearningOutcomeV2MatchWithRelevance,
} from 'src/modules/query-processor/types/course-aggregation.type';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a mock ID for testing
 */
export const createMockId = (str: string): Identifier => {
  return str as Identifier;
};

/**
 * Creates a mock timestamp for testing
 */
export const createMockTimestamp = () => new Date('2024-01-01T10:00:00Z');

// ============================================================================
// LEARNING OUTCOME BUILDERS
// ============================================================================

/**
 * Creates a mock LearningOutcome
 */
export const createMockLearningOutcome = (
  overrides: Partial<LearningOutcome> = {},
): LearningOutcome => ({
  loId: createMockId('lo-1'),
  originalName: 'Understand data analysis concepts',
  cleanedName: 'understand data analysis concepts',
  skipEmbedding: false,
  hasEmbedding768: true,
  hasEmbedding1536: false,
  createdAt: createMockTimestamp(),
  updatedAt: createMockTimestamp(),
  ...overrides,
});

/**
 * Creates a mock MatchedLearningOutcome with similarity score
 */
export const createMockMatchedLearningOutcome = (
  overrides: Partial<MatchedLearningOutcome> = {},
): MatchedLearningOutcome => ({
  ...createMockLearningOutcome(overrides),
  similarityScore: 0.85,
  ...overrides,
});

// ============================================================================
// COURSE BUILDERS
// ============================================================================

/**
 * Creates a mock CourseWithLearningOutcomeV2Match
 * This is the base course type returned from similarity search
 */
export const createMockCourseWithLearningOutcomeV2Match = (
  overrides: Partial<CourseWithLearningOutcomeV2Match> = {},
): CourseWithLearningOutcomeV2Match => {
  const baseCourseId = createMockId(overrides.id?.toString() || 'course-1');

  return {
    id: baseCourseId,
    campusId: createMockId('campus-1'),
    facultyId: createMockId('faculty-1'),
    subjectCode: 'CS101',
    subjectName: 'Introduction to Computer Science',
    isGenEd: false,
    matchedLearningOutcomes: [
      createMockMatchedLearningOutcome({ loId: createMockId('lo-1') }),
      createMockMatchedLearningOutcome({ loId: createMockId('lo-2') }),
    ],
    remainingLearningOutcomes: [
      createMockLearningOutcome({ loId: createMockId('lo-3') }),
    ],
    allLearningOutcomes: [
      createMockLearningOutcome({ loId: createMockId('lo-1') }),
      createMockLearningOutcome({ loId: createMockId('lo-2') }),
      createMockLearningOutcome({ loId: createMockId('lo-3') }),
    ],
    courseOfferings: [],
    courseClickLogs: [],
    metadata: null,
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
    ...overrides,
  };
};

/**
 * Creates a mock CourseWithLearningOutcomeV2MatchWithRelevance
 * This extends the base course type with LLM relevance filtering results
 */
export const createMockCourseWithRelevance = (
  overrides: Partial<CourseWithLearningOutcomeV2MatchWithRelevance> = {},
): CourseWithLearningOutcomeV2MatchWithRelevance => {
  const baseCourse = createMockCourseWithLearningOutcomeV2Match(overrides);

  return {
    ...baseCourse,
    score: overrides.score ?? 3,
    reason: overrides.reason ?? 'Highly relevant course',
    ...overrides,
  };
};

// ============================================================================
// AGGREGATED COURSE BUILDERS
// ============================================================================

/**
 * Creates a mock AggregatedCourseSkills
 * This represents a course after aggregation across multiple skills
 */
export const createMockAggregatedCourseSkills = (
  overrides: Partial<AggregatedCourseSkills> = {},
): AggregatedCourseSkills => {
  const courseId = createMockId(overrides.id?.toString() || 'course-1');

  return {
    id: courseId,
    campusId: createMockId('campus-1'),
    facultyId: createMockId('faculty-1'),
    subjectCode: 'CS101',
    subjectName: 'Introduction to Computer Science',
    isGenEd: false,
    courseLearningOutcomes: [
      createMockLearningOutcome({ loId: createMockId('lo-1') }),
      createMockLearningOutcome({ loId: createMockId('lo-2') }),
      createMockLearningOutcome({ loId: createMockId('lo-3') }),
    ],
    courseOfferings: [],
    courseClickLogs: [],
    metadata: null,
    createdAt: createMockTimestamp(),
    updatedAt: createMockTimestamp(),
    matchedSkills: [],
    relevanceScore: overrides.relevanceScore ?? 0.9,
    ...overrides,
  };
};

// ============================================================================
// EMBEDDING USAGE BUILDERS
// ============================================================================

/**
 * Creates a mock embedding usage entry for a single skill
 */
export const createMockEmbeddingSkillUsage = (
  overrides: {
    promptTokens?: number;
    model?: string;
  } = {},
) => ({
  promptTokens: overrides.promptTokens ?? 5,
  model: overrides.model ?? 'e5-base',
});

/**
 * Creates a mock embedding usage object with multiple skills
 */
export const createMockEmbeddingUsage = (
  skillsCount: number = 2,
  model: string = 'e5-base',
) => ({
  bySkill: Array.from({ length: skillsCount }, (_, i) =>
    createMockEmbeddingSkillUsage({
      promptTokens: 5 + i,
      model,
    }),
  ),
});

// ============================================================================
// FILTER RESULT BUILDERS
// ============================================================================

/**
 * Creates mock filter result maps for course relevance filtering
 */
export const createMockFilterResultMaps = () => {
  const acceptedCourse = createMockCourseWithRelevance({
    id: createMockId('course-1'),
    subjectCode: 'CS101',
    score: 3,
    reason: 'Excellent match',
  });

  const rejectedCourse = createMockCourseWithRelevance({
    id: createMockId('course-2'),
    subjectCode: 'CS102',
    score: 0,
    reason: 'Not relevant',
  });

  const missingCourse = createMockCourseWithRelevance({
    id: createMockId('course-3'),
    subjectCode: 'CS103',
    score: 0,
    reason: '',
  });

  return {
    llmAcceptedCoursesBySkill: new Map<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >([['data analysis', [acceptedCourse]]]),
    llmRejectedCoursesBySkill: new Map<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >([['data analysis', [rejectedCourse]]]),
    llmMissingCoursesBySkill: new Map<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >([['data analysis', [missingCourse]]]),
  };
};

/**
 * Creates empty filter result maps for edge case testing
 */
export const createEmptyFilterResultMaps = () => ({
  llmAcceptedCoursesBySkill: new Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >(),
  llmRejectedCoursesBySkill: new Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >(),
  llmMissingCoursesBySkill: new Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >(),
});

// ============================================================================
// SKILL-TO-COURSES MAP BUILDERS
// ============================================================================

/**
 * Creates a mock skill-to-courses map for aggregation testing
 */
export const createMockSkillCoursesMap = (withDuplicates: boolean = false) => {
  const course1 = createMockCourseWithRelevance({
    id: createMockId('course-1'),
    subjectCode: 'CS101',
    score: 3,
    reason: 'High relevance',
  });

  const course2 = createMockCourseWithRelevance({
    id: createMockId('course-2'),
    subjectCode: 'CS102',
    score: 2,
    reason: 'Medium relevance',
  });

  const course3 = createMockCourseWithRelevance({
    id: createMockId('course-3'),
    subjectCode: 'CS103',
    score: 1,
    reason: 'Low relevance',
  });

  const map = new Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >();

  // Skill 1: data analysis
  map.set('data analysis', [course1, course2]);

  // Skill 2: statistics
  if (withDuplicates) {
    // Include CS101 again to test deduplication
    map.set('statistics', [course1, course3]);
  } else {
    map.set('statistics', [course3]);
  }

  // Skill 3: python
  map.set('python', [course2]);

  return map;
};

/**
 * Creates an empty skill-to-courses map
 */
export const createEmptySkillCoursesMap = () => {
  return new Map<string, CourseWithLearningOutcomeV2MatchWithRelevance[]>();
};

/**
 * Creates a skill-to-courses map with tie scenarios for aggregation
 */
export const createMockSkillCoursesMapWithTies = () => {
  const course1 = createMockCourseWithRelevance({
    id: createMockId('course-1'),
    subjectCode: 'CS101',
    score: 3,
    reason: 'High relevance',
  });

  const course2 = createMockCourseWithRelevance({
    id: createMockId('course-2'),
    subjectCode: 'CS102',
    score: 2,
    reason: 'Medium relevance',
  });

  const course3 = createMockCourseWithRelevance({
    id: createMockId('course-3'),
    subjectCode: 'CS103',
    score: 3,
    reason: 'High relevance',
  });

  const map = new Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >();

  // CS101 has score 3 for data analysis
  map.set('data analysis', [course1]);

  // CS101 also has score 3 for statistics (tie!)
  // CS102 has score 2 for statistics
  map.set('statistics', [course1, course2]);

  // CS103 has score 3 for python
  map.set('python', [course3]);

  return map;
};

// ============================================================================
// AGGREGATED COURSES BUILDERS
// ============================================================================

/**
 * Creates mock aggregated courses for aggregation metrics testing
 */
export const createMockAggregatedCourses = () => {
  return [
    createMockAggregatedCourseSkills({
      id: createMockId('course-1'),
      subjectCode: 'CS101',
      subjectName: 'Introduction to Computer Science',
      relevanceScore: 3,
    }),
    createMockAggregatedCourseSkills({
      id: createMockId('course-2'),
      subjectCode: 'CS102',
      subjectName: 'Data Structures',
      relevanceScore: 2,
    }),
    createMockAggregatedCourseSkills({
      id: createMockId('course-3'),
      subjectCode: 'CS103',
      subjectName: 'Algorithms',
      relevanceScore: 1,
    }),
  ];
};

/**
 * Creates aggregated courses with duplicate final scores for distribution testing
 */
export const createMockAgegratedCoursesWithSameScores = () => {
  return [
    createMockAggregatedCourseSkills({
      id: createMockId('course-1'),
      subjectCode: 'CS101',
      relevanceScore: 3,
    }),
    createMockAggregatedCourseSkills({
      id: createMockId('course-2'),
      subjectCode: 'CS102',
      relevanceScore: 3,
    }),
    createMockAggregatedCourseSkills({
      id: createMockId('course-3'),
      subjectCode: 'CS103',
      relevanceScore: 3,
    }),
  ];
};

// ============================================================================
// TEST DATA CONSTANTS
// ============================================================================

/**
 * Common test data for embedding cost calculations
 */
export const EMBEDDING_COST_TEST_DATA = {
  ZERO_SKILLS: {
    bySkill: [] as Array<{ promptTokens: number; model: string }>,
  },
  SINGLE_SKILL: {
    bySkill: [createMockEmbeddingSkillUsage({ promptTokens: 10 })] as Array<{
      promptTokens: number;
      model: string;
    }>,
  },
  MULTIPLE_SKILLS: {
    bySkill: [
      createMockEmbeddingSkillUsage({ promptTokens: 10 }),
      createMockEmbeddingSkillUsage({ promptTokens: 15 }),
      createMockEmbeddingSkillUsage({ promptTokens: 20 }),
    ] as Array<{ promptTokens: number; model: string }>,
  },
  DIFFERENT_MODELS: {
    bySkill: [
      createMockEmbeddingSkillUsage({ promptTokens: 10, model: 'e5-base' }),
      createMockEmbeddingSkillUsage({
        promptTokens: 10,
        model: 'openai/text-embedding-3-small',
      }),
    ] as Array<{ promptTokens: number; model: string }>,
  },
};

/**
 * Common test data for skill filter metrics
 */
export const FILTER_METRICS_TEST_DATA = {
  ALL_ACCEPTED: {
    skill: 'data analysis',
    filterResult: {
      llmAcceptedCoursesBySkill: new Map([
        [
          'data analysis',
          [
            createMockCourseWithRelevance({
              score: 3,
              reason: 'Perfect match',
            }),
            createMockCourseWithRelevance({ score: 2, reason: 'Good match' }),
          ],
        ],
      ]),
      llmRejectedCoursesBySkill: new Map(),
      llmMissingCoursesBySkill: new Map(),
    },
  },
  ALL_REJECTED: {
    skill: 'data analysis',
    filterResult: {
      llmAcceptedCoursesBySkill: new Map(),
      llmRejectedCoursesBySkill: new Map([
        [
          'data analysis',
          [
            createMockCourseWithRelevance({ score: 0, reason: 'Not relevant' }),
            createMockCourseWithRelevance({ score: 0, reason: 'Too advanced' }),
          ],
        ],
      ]),
      llmMissingCoursesBySkill: new Map(),
    },
  },
  ALL_MISSING: {
    skill: 'data analysis',
    filterResult: {
      llmAcceptedCoursesBySkill: new Map(),
      llmRejectedCoursesBySkill: new Map(),
      llmMissingCoursesBySkill: new Map([
        [
          'data analysis',
          [
            createMockCourseWithRelevance({ score: 0, reason: '' }),
            createMockCourseWithRelevance({ score: 0, reason: '' }),
          ],
        ],
      ]),
    },
  },
  EMPTY_RESULTS: {
    skill: 'data analysis',
    filterResult: {
      llmAcceptedCoursesBySkill: new Map(),
      llmRejectedCoursesBySkill: new Map(),
      llmMissingCoursesBySkill: new Map(),
    },
  },
} as const;
