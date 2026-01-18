import type { Identifier } from 'src/shared/contracts/types/identifier';

import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import type {
  AggregatedCourseSkills,
  CourseWithLearningOutcomeV2MatchWithRelevance,
} from '../../../../../query-processor/types/course-aggregation.type';
import type { CourseRelevanceFilterResultV2 } from '../../../../../query-processor/types/course-relevance-filter.type';
import type { STEP_NAME } from '../../../../types/query-status.type';

/**
 * Test fixtures for QueryStepParserHelper unit tests.
 *
 * Provides mock data for all step types and parsing scenarios.
 */

// ============================================================================
// MOCK COURSE DATA
// ============================================================================

export const createMockCourse = (
  overrides: Partial<CourseWithLearningOutcomeV2Match> = {},
): CourseWithLearningOutcomeV2Match => ({
  id: 'course-123' as Identifier,
  campusId: 'campus-1' as Identifier,
  facultyId: 'faculty-1' as Identifier,
  subjectCode: 'CS101',
  subjectName: 'Introduction to Programming',
  isGenEd: false,
  matchedLearningOutcomes: [],
  remainingLearningOutcomes: [],
  allLearningOutcomes: [],
  courseOfferings: [],
  courseClickLogs: [],
  metadata: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

export const createMockCourseWithRelevance = (
  overrides: Partial<CourseWithLearningOutcomeV2MatchWithRelevance> = {},
): CourseWithLearningOutcomeV2MatchWithRelevance => ({
  ...createMockCourse(),
  score: 2,
  reason: 'Good match for skill',
  ...overrides,
});

export const createMockAggregatedCourse = (
  overrides: Partial<AggregatedCourseSkills> = {},
): AggregatedCourseSkills => ({
  id: 'course-123' as Identifier,
  campusId: 'campus-1' as Identifier,
  facultyId: 'faculty-1' as Identifier,
  subjectCode: 'CS101',
  subjectName: 'Introduction to Programming',
  isGenEd: false,
  courseLearningOutcomes: [],
  courseOfferings: [],
  courseClickLogs: [],
  metadata: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  matchedSkills: [],
  relevanceScore: 3,
  ...overrides,
});

// ============================================================================
// QUESTION_CLASSIFICATION STEP FIXTURES
// ============================================================================

export const validClassificationRawOutput = {
  category: 'relevant',
  reason: 'Question is about courses and skills',
};

export const invalidClassificationRawOutput = {
  category: 123, // Should be string
  reason: 'Test',
};

export const missingFieldClassificationRawOutput = {
  category: 'relevant',
  // Missing 'reason' field
};

// ============================================================================
// SKILL_EXPANSION STEP FIXTURES
// ============================================================================

export const validSkillExpansionRawOutput = {
  skillItems: [
    {
      skill: 'python programming',
      reason: 'Direct mention of Python in question',
    },
    {
      skill: 'software development',
      reason: 'Implied by programming context',
    },
  ],
};

export const invalidSkillExpansionRawOutput = {
  skillItems: 'not-an-array', // Should be array
};

export const invalidSkillItemStructureRawOutput = {
  skillItems: [
    {
      skill: 'python',
      // Missing 'reason' field
    },
  ],
};

// ============================================================================
// COURSE_RETRIEVAL STEP FIXTURES
// ============================================================================

export const validCourseRetrievalRawOutput = {
  skills: ['python', 'javascript'],
  skillCoursesMap: {
    python: [createMockCourse({ subjectCode: 'CS201' })],
    javascript: [createMockCourse({ subjectCode: 'CS202' })],
  },
  embeddingUsage: {
    bySkill: [
      {
        skill: 'python',
        model: 'e5-base',
        provider: 'local',
        dimension: 768,
        promptTokens: 2,
        totalTokens: 2,
      },
    ],
    totalTokens: 2,
  },
};

export const validCourseRetrievalWithoutEmbeddingRawOutput = {
  skills: ['python'],
  skillCoursesMap: {
    python: [createMockCourse()],
  },
  // embeddingUsage is optional
};

export const invalidCourseRetrievalRawOutput = {
  skills: 'not-an-array', // Should be array
  skillCoursesMap: {},
};

export const emptyCourseRetrievalRawOutput = {
  skills: [],
  skillCoursesMap: {},
};

export const courseRetrievalWithEmptyMapRawOutput = {
  skills: ['python'],
  skillCoursesMap: {
    python: [], // Empty array for skill
  },
};

// ============================================================================
// COURSE_RELEVANCE_FILTER STEP FIXTURES
// ============================================================================

export const validCourseFilterRawOutput: CourseRelevanceFilterResultV2 = {
  llmAcceptedCoursesBySkill: new Map([
    ['python', [createMockCourseWithRelevance({ score: 3 })]],
    ['javascript', [createMockCourseWithRelevance({ score: 2 })]],
  ]),
  llmRejectedCoursesBySkill: new Map([
    [
      'python',
      [createMockCourseWithRelevance({ score: 0, reason: 'Not relevant' })],
    ],
  ]),
  llmMissingCoursesBySkill: new Map([
    [
      'python',
      [createMockCourseWithRelevance({ score: 0, reason: 'Missing from LLM' })],
    ],
  ]),
  llmInfo: {
    model: 'openai/gpt-4o-mini',
    provider: 'openrouter',
    systemPrompt: 'Filter courses',
    userPrompt: 'Filter these courses',
    promptVersion: '1.0',
  },
  tokenUsage: {
    model: 'openai/gpt-4o-mini',
    inputTokens: 1000,
    outputTokens: 500,
  },
};

// Serialized version (as stored in JSONB) - uses plain objects
export const validCourseFilterRawOutputSerialized = {
  llmAcceptedCoursesBySkill: {
    python: [createMockCourseWithRelevance({ score: 3 })],
    javascript: [createMockCourseWithRelevance({ score: 2 })],
  },
  llmRejectedCoursesBySkill: {
    python: [
      createMockCourseWithRelevance({ score: 0, reason: 'Not relevant' }),
    ],
  },
  llmMissingCoursesBySkill: {
    python: [
      createMockCourseWithRelevance({ score: 0, reason: 'Missing from LLM' }),
    ],
  },
  llmInfo: {
    model: 'openai/gpt-4o-mini',
    provider: 'openrouter',
    systemPrompt: 'Filter courses',
    userPrompt: 'Filter these courses',
    promptVersion: '1.0',
  },
  tokenUsage: {
    model: 'openai/gpt-4o-mini',
    inputTokens: 1000,
    outputTokens: 500,
  },
};

export const courseFilterWithEmptyMapsRawOutput = {
  llmAcceptedCoursesBySkill: {},
  llmRejectedCoursesBySkill: {},
  llmMissingCoursesBySkill: {},
  llmInfo: {
    model: 'openai/gpt-4o-mini',
    provider: 'openrouter',
    systemPrompt: 'Filter courses',
    userPrompt: 'Filter these courses',
    promptVersion: '1.0',
  },
  tokenUsage: {
    model: 'openai/gpt-4o-mini',
    inputTokens: 100,
    outputTokens: 50,
  },
};

export const courseFilterWithPartialMapsRawOutput = {
  llmAcceptedCoursesBySkill: {
    python: [createMockCourseWithRelevance({ score: 2 })],
  },
  // llmRejectedCoursesBySkill: undefined (optional field)
  // llmMissingCoursesBySkill: undefined (optional field)
  llmInfo: {
    model: 'openai/gpt-4o-mini',
    provider: 'openrouter',
    systemPrompt: 'Filter courses',
    userPrompt: 'Filter these courses',
    promptVersion: '1.0',
  },
  tokenUsage: {
    model: 'openai/gpt-4o-mini',
    inputTokens: 500,
    outputTokens: 200,
  },
};

// ============================================================================
// COURSE_AGGREGATION STEP FIXTURES
// ============================================================================

export const validCourseAggregationRawOutput = {
  filteredSkillCoursesMap: {
    python: [createMockCourseWithRelevance({ score: 3 })],
    javascript: [createMockCourseWithRelevance({ score: 2 })],
  },
  rankedCourses: [createMockAggregatedCourse({ relevanceScore: 3 })],
};

export const invalidCourseAggregationRawOutput = {
  filteredSkillCoursesMap: 'not-an-object', // Should be record
  rankedCourses: [],
};

export const emptyCourseAggregationRawOutput = {
  filteredSkillCoursesMap: {},
  rankedCourses: [],
};

export const courseAggregationWithMultipleSkillsRawOutput = {
  filteredSkillCoursesMap: {
    python: [
      createMockCourseWithRelevance({ subjectCode: 'CS201', score: 3 }),
      createMockCourseWithRelevance({ subjectCode: 'CS202', score: 2 }),
    ],
    javascript: [
      createMockCourseWithRelevance({ subjectCode: 'CS203', score: 3 }),
    ],
    datastructures: [
      createMockCourseWithRelevance({ subjectCode: 'CS204', score: 1 }),
    ],
  },
  rankedCourses: [
    createMockAggregatedCourse({ subjectCode: 'CS201', relevanceScore: 3 }),
    createMockAggregatedCourse({ subjectCode: 'CS203', relevanceScore: 3 }),
    createMockAggregatedCourse({ subjectCode: 'CS202', relevanceScore: 2 }),
  ],
};

// ============================================================================
// ANSWER_SYNTHESIS STEP FIXTURES
// ============================================================================

export const validAnswerSynthesisRawOutput = {
  answer:
    'Based on your question about Python programming, I recommend CS201: Introduction to Python. This course covers fundamental concepts including variables, data types, control flow, and object-oriented programming.',
};

export const invalidAnswerSynthesisRawOutput = {
  answer: 123, // Should be string
};

export const emptyAnswerSynthesisRawOutput = {
  answer: '',
};

// ============================================================================
// RECONSTRUCT MAP FIXTURES
// ============================================================================

export const emptyObjectForMap = {};

export const singleEntryObjectForMap = {
  python: [createMockCourse()],
};

export const multipleEntriesObjectForMap = {
  python: [createMockCourse({ subjectCode: 'CS201' })],
  javascript: [createMockCourse({ subjectCode: 'CS202' })],
  java: [createMockCourse({ subjectCode: 'CS203' })],
};

export const complexObjectForMap = {
  python: [
    createMockCourse({ subjectCode: 'CS201' }),
    createMockCourse({ subjectCode: 'CS202' }),
  ],
  javascript: [createMockCourse({ subjectCode: 'CS203' })],
};

// ============================================================================
// ERROR SCENARIO FIXTURES
// ============================================================================

export const nullRawOutput = null;

export const undefinedRawOutput = undefined;

export const emptyObjectRawOutput = {};

export const arrayRawOutput = [1, 2, 3];

export const stringRawOutput = 'invalid output';

export const numberRawOutput = 12345;

// ============================================================================
// STEP NAME CONSTANTS FOR TESTING
// ============================================================================

export const allStepNames: readonly (typeof STEP_NAME)[keyof typeof STEP_NAME][] =
  [
    'QUESTION_CLASSIFICATION',
    'SKILL_EXPANSION',
    'COURSE_RETRIEVAL',
    'COURSE_RELEVANCE_FILTER',
    'COURSE_AGGREGATION',
    'ANSWER_SYNTHESIS',
  ] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert a Map to a plain object (simulating JSONB storage)
 */
export const mapToRecord = <K extends string, V>(
  map: Map<K, V>,
): Record<K, V> => {
  return Object.fromEntries(map.entries()) as Record<K, V>;
};

/**
 * Create a serialized version of course filter output for testing
 */
export const createSerializedCourseFilterOutput = (
  accepted?: Record<string, CourseWithLearningOutcomeV2MatchWithRelevance[]>,
  rejected?: Record<string, CourseWithLearningOutcomeV2MatchWithRelevance[]>,
  missing?: Record<string, CourseWithLearningOutcomeV2MatchWithRelevance[]>,
): CourseRelevanceFilterResultV2 => ({
  llmAcceptedCoursesBySkill: accepted
    ? (new Map(
        Object.entries(accepted),
      ) as CourseRelevanceFilterResultV2['llmAcceptedCoursesBySkill'])
    : new Map(),
  llmRejectedCoursesBySkill: rejected
    ? (new Map(
        Object.entries(rejected),
      ) as CourseRelevanceFilterResultV2['llmRejectedCoursesBySkill'])
    : new Map(),
  llmMissingCoursesBySkill: missing
    ? (new Map(
        Object.entries(missing),
      ) as CourseRelevanceFilterResultV2['llmMissingCoursesBySkill'])
    : new Map(),
  llmInfo: {
    model: 'openai/gpt-4o-mini',
    provider: 'openrouter',
    systemPrompt: 'Test',
    userPrompt: 'Test',
    promptVersion: '1.0',
  },
  tokenUsage: {
    model: 'openai/gpt-4o-mini',
    inputTokens: 100,
    outputTokens: 50,
  },
});
