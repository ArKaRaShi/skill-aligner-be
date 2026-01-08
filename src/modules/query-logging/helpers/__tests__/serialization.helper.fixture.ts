import { Identifier } from 'src/shared/contracts/types/identifier';
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import type {
  LearningOutcome,
  MatchedLearningOutcome,
} from '../../../course/types/course-learning-outcome-v2.type';
import type { CourseWithLearningOutcomeV2Match } from '../../../course/types/course.type';
import type { CourseWithLearningOutcomeV2MatchWithRelevance } from '../../../query-processor/types/course-aggregation.type';
import type {
  CourseMatchWithRelevanceMap,
  CourseRelevanceFilterResultV2,
} from '../../../query-processor/types/course-relevance-filter.type';

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
// LLM INFO & TOKEN USAGE BUILDERS
// ============================================================================

/**
 * Creates a mock LlmInfo object
 */
export const createMockLlmInfo = (
  overrides: Partial<LlmInfo> = {},
): LlmInfo => ({
  model: 'gpt-4',
  provider: 'openai',
  systemPrompt: 'System prompt',
  userPrompt: 'User prompt',
  promptVersion: '2024-01-01',
  ...overrides,
});

/**
 * Creates a mock TokenUsage object
 */
export const createMockTokenUsage = (
  overrides: Partial<TokenUsage> = {},
): TokenUsage => ({
  model: 'gpt-4',
  inputTokens: 100,
  outputTokens: 50,
  ...overrides,
});

// ============================================================================
// MAP BUILDERS
// ============================================================================

/**
 * Creates a mock course relevance map (skill -> courses[])
 */
export const createMockCourseRelevanceMap = (): CourseMatchWithRelevanceMap => {
  const course1 = createMockCourseWithRelevance({
    id: createMockId('course-1'),
    subjectCode: 'CS101',
    score: 3,
    reason: 'Excellent match',
  });

  const course2 = createMockCourseWithRelevance({
    id: createMockId('course-2'),
    subjectCode: 'CS102',
    score: 2,
    reason: 'Good match',
  });

  const map = new Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >();
  map.set('data analysis', [course1, course2]);
  map.set('statistics', [course1]);

  return map;
};

/**
 * Creates an empty course relevance map
 */
export const createEmptyCourseRelevanceMap =
  (): CourseMatchWithRelevanceMap => {
    return new Map<string, CourseWithLearningOutcomeV2MatchWithRelevance[]>();
  };

// ============================================================================
// FILTER RESULT BUILDERS
// ============================================================================

/**
 * Creates a mock CourseRelevanceFilterResultV2 with populated maps
 */
export const createMockCourseFilterResult = (
  overrides: Partial<CourseRelevanceFilterResultV2> = {},
): CourseRelevanceFilterResultV2 => {
  return {
    llmAcceptedCoursesBySkill: createMockCourseRelevanceMap(),
    llmRejectedCoursesBySkill: createMockCourseRelevanceMap(),
    llmMissingCoursesBySkill: createMockCourseRelevanceMap(),
    llmInfo: createMockLlmInfo(),
    tokenUsage: createMockTokenUsage(),
    ...overrides,
  };
};

/**
 * Creates a CourseRelevanceFilterResultV2 with empty maps
 */
export const createEmptyCourseFilterResult =
  (): CourseRelevanceFilterResultV2 => {
    return {
      llmAcceptedCoursesBySkill: createEmptyCourseRelevanceMap(),
      llmRejectedCoursesBySkill: createEmptyCourseRelevanceMap(),
      llmMissingCoursesBySkill: createEmptyCourseRelevanceMap(),
      llmInfo: createMockLlmInfo(),
      tokenUsage: createMockTokenUsage(),
    };
  };

// ============================================================================
// TEST DATA CONSTANTS
// ============================================================================

/**
 * Common test data for serializeMap tests
 */
export const SERIALIZE_MAP_TEST_DATA = {
  EMPTY_MAP: new Map<string, string>(),

  SINGLE_ENTRY_MAP: new Map([['key1', 'value1']]),

  MULTIPLE_ENTRIES_MAP: new Map([
    ['key1', 'value1'],
    ['key2', 'value2'],
    ['key3', 'value3'],
  ]),

  NUMERIC_KEYS_MAP: new Map([
    [1, 'value1'],
    [2, 'value2'],
    [3, 'value3'],
  ]),

  MIXED_TYPE_VALUES_MAP: new Map<string, string | number | boolean | null>([
    ['string', 'text value'],
    ['number', 42],
    ['boolean', true],
    ['null', null],
  ]),

  NESTED_MAP: new Map([
    ['outer1', new Map([['inner1', 'nested value']])],
    ['outer2', new Map([['inner2', 'another nested']])],
  ]),

  ARRAY_VALUES_MAP: new Map([
    ['skills', ['data analysis', 'statistics', 'python']],
    ['courses', ['CS101', 'CS102', 'CS103']],
  ]),

  COMPLEX_NESTED_MAP: new Map([
    [
      'data analysis',
      [
        {
          subjectCode: 'CS101',
          score: 3,
          reason: 'Perfect match',
        },
        {
          subjectCode: 'CS102',
          score: 2,
          reason: 'Good match',
        },
      ],
    ],
    [
      'statistics',
      [
        {
          subjectCode: 'CS101',
          score: 3,
          reason: 'Highly relevant',
        },
      ],
    ],
  ]) as Map<string, unknown>,
} as const;

/**
 * Common test data for serializeCourseFilterResult tests
 */
export const SERIALIZE_FILTER_RESULT_TEST_DATA = {
  EMPTY_RESULT: {
    input: createEmptyCourseFilterResult(),
    description: 'All maps are empty',
  },

  SINGLE_SKILL_SINGLE_COURSE: {
    input: {
      llmAcceptedCoursesBySkill: new Map([
        [
          'data analysis',
          [
            createMockCourseWithRelevance({
              subjectCode: 'CS101',
              score: 3,
            }),
          ],
        ],
      ]),
      llmRejectedCoursesBySkill: new Map([
        [
          'data analysis',
          [
            createMockCourseWithRelevance({
              subjectCode: 'CS102',
              score: 0,
            }),
          ],
        ],
      ]),
      llmMissingCoursesBySkill: new Map([
        [
          'data analysis',
          [
            createMockCourseWithRelevance({
              subjectCode: 'CS103',
              score: 0,
              reason: '',
            }),
          ],
        ],
      ]),
      llmInfo: createMockLlmInfo({ model: 'gpt-4' }),
      tokenUsage: createMockTokenUsage({ inputTokens: 150 }),
    },
    description: 'Single skill with single course in each category',
  },

  MULTIPLE_SKILLS_MULTIPLE_COURSES: {
    input: createMockCourseFilterResult(),
    description: 'Multiple skills with multiple courses',
  },

  ONLY_ACCEPTED_COURSES: {
    input: {
      llmAcceptedCoursesBySkill: createMockCourseRelevanceMap(),
      llmRejectedCoursesBySkill: createEmptyCourseRelevanceMap(),
      llmMissingCoursesBySkill: createEmptyCourseRelevanceMap(),
      llmInfo: createMockLlmInfo({ provider: 'openrouter' }),
      tokenUsage: createMockTokenUsage({ inputTokens: 150 }),
    },
    description: 'Only accepted courses present',
  },

  ONLY_REJECTED_COURSES: {
    input: {
      llmAcceptedCoursesBySkill: createEmptyCourseRelevanceMap(),
      llmRejectedCoursesBySkill: createMockCourseRelevanceMap(),
      llmMissingCoursesBySkill: createEmptyCourseRelevanceMap(),
      llmInfo: createMockLlmInfo({ model: 'claude-3' }),
      tokenUsage: createMockTokenUsage({ outputTokens: 75 }),
    },
    description: 'Only rejected courses present',
  },

  ONLY_MISSING_COURSES: {
    input: {
      llmAcceptedCoursesBySkill: createEmptyCourseRelevanceMap(),
      llmRejectedCoursesBySkill: createEmptyCourseRelevanceMap(),
      llmMissingCoursesBySkill: createMockCourseRelevanceMap(),
      llmInfo: createMockLlmInfo({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
      }),
      tokenUsage: createMockTokenUsage({ inputTokens: 300 }),
    },
    description: 'Only missing courses present',
  },
} as const;
