import type { Identifier } from 'src/shared/contracts/types/identifier';
import type { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import type { CourseClickLog } from 'src/modules/course/types/course-click-log.type';
import type {
  LearningOutcome,
  MatchedLearningOutcome,
} from 'src/modules/course/types/course-learning-outcome-v2.type';
import type { CourseOffering } from 'src/modules/course/types/course-offering.type';
import type { CourseWithLearningOutcomeV2Match as CourseWithLOV2Match } from 'src/modules/course/types/course.type';
import type { MatchedSkillLearningOutcomes } from 'src/modules/course/types/skill-learning-outcome.type';
import type { StepEmbeddingConfig } from 'src/modules/query-logging/types/query-embedding-config.type';
import type { StepLlmConfig } from 'src/modules/query-logging/types/query-llm-config.type';
import type {
  AnswerSynthesisRawOutput,
  ClassificationRawOutput,
  CourseAggregationRawOutput,
  CourseFilterRawOutput,
  CourseRetrievalRawOutput,
  QueryProcessLogWithSteps,
  QueryProcessStep,
  ServiceMetrics,
  SkillExpansionRawOutput,
} from 'src/modules/query-logging/types/query-log-step.type';
import { STEP_NAME } from 'src/modules/query-logging/types/query-status.type';
import type {
  AggregatedCourseSkills,
  CourseWithLearningOutcomeV2MatchWithRelevance,
  RelevanceResult,
} from 'src/modules/query-processor/types/course-aggregation.type';

// ============================================================================
// LAYER 1: PRIMITIVE BUILDING BLOCKS
// ============================================================================

/**
 * Fixed timestamps for deterministic test data
 */
export const MOCK_TIMESTAMPS = {
  START: new Date('2024-01-01T10:00:00Z'),
  STEP_1_END: new Date('2024-01-01T10:00:00.8Z'),
  STEP_2_START: new Date('2024-01-01T10:00:05Z'),
  STEP_2_END: new Date('2024-01-01T10:00:06.2Z'),
  STEP_3_START: new Date('2024-01-01T10:00:10Z'),
  STEP_3_END: new Date('2024-01-01T10:00:11.5Z'),
  STEP_4_START: new Date('2024-01-01T10:00:12Z'),
  STEP_4_END: new Date('2024-01-01T10:00:14Z'),
  STEP_5_END: new Date('2024-01-01T10:00:17Z'),
  STEP_6_END: new Date('2024-01-01T10:00:17.5Z'),
  STEP_7_END: new Date('2024-01-01T10:00:21.5Z'),
} as const;

/**
 * Helper to create typed IDs (branded strings)
 */
export const createMockId = (str: string): Identifier => {
  // In a real branded string, there would be a symbol check
  // For test fixtures, we cast to satisfy the type system
  return str as Identifier;
};

/**
 * Helper to create a Date for testing
 */
export const createMockDate = (offsetMs = 0): Date => {
  return new Date(MOCK_TIMESTAMPS.START.getTime() + offsetMs);
};

// ============================================================================
// LAYER 2: SIMPLE OUTPUT TYPES
// ============================================================================

/**
 * Type-safe factory for ClassificationRawOutput
 */
export const createMockClassificationRawOutput = (
  overrides: Partial<ClassificationRawOutput> = {},
): ClassificationRawOutput => ({
  category: 'relevant',
  reason: 'User is asking about learning skills',
  ...overrides,
});

/**
 * Type-safe factory for SkillExpansionRawOutput
 */
export const createMockSkillExpansionRawOutput = (
  overrides: Partial<SkillExpansionRawOutput> = {},
): SkillExpansionRawOutput => ({
  skillItems: [
    { skill: 'data analysis', reason: 'Direct match' },
    { skill: 'statistics', reason: 'Related skill' },
    { skill: 'python', reason: 'Tool for data analysis' },
  ],
  ...overrides,
});

/**
 * Type-safe factory for AnswerSynthesisRawOutput
 */
export const createMockAnswerSynthesisRawOutput = (
  overrides: Partial<AnswerSynthesisRawOutput> = {},
): AnswerSynthesisRawOutput => ({
  answer:
    'For data analysis, you should start with statistics and Python programming...',
  ...overrides,
});

// ============================================================================
// LAYER 3: COURSE COMPONENT TYPES
// ============================================================================

/**
 * Type-safe factory for LearningOutcome
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
  createdAt: MOCK_TIMESTAMPS.START,
  updatedAt: MOCK_TIMESTAMPS.START,
  ...overrides,
});

/**
 * Type-safe factory for MatchedLearningOutcome
 */
export const createMockMatchedLearningOutcome = (
  overrides: Partial<MatchedLearningOutcome> = {},
): MatchedLearningOutcome => ({
  ...createMockLearningOutcome(overrides),
  similarityScore: 0.85,
  ...overrides,
});

/**
 * Type-safe factory for CourseOffering
 */
export const createMockCourseOffering = (
  overrides: Partial<CourseOffering> = {},
): CourseOffering => ({
  id: createMockId('offering-1'),
  courseId: createMockId('course-1'),
  semester: 1,
  academicYear: 2024,
  createdAt: MOCK_TIMESTAMPS.START,
  ...overrides,
});

/**
 * Type-safe factory for CourseClickLog
 */
export const createMockCourseClickLog = (
  overrides: Partial<CourseClickLog> = {},
): CourseClickLog => ({
  id: createMockId('click-1'),
  questionId: createMockId('question-1'),
  courseId: createMockId('course-1'),
  createdAt: MOCK_TIMESTAMPS.START,
  ...overrides,
});

// ============================================================================
// LAYER 5: SIMPLE COURSE MATCH TYPE
// ============================================================================

/**
 * Type-safe factory for CourseWithLearningOutcomeV2Match
 * This is a complex type with many nested required fields
 */
export const createMockCourseWithLearningOutcomeV2Match = (
  overrides: Partial<CourseWithLOV2Match> = {},
): CourseWithLOV2Match => {
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
    courseOfferings: [createMockCourseOffering({ courseId: baseCourseId })],
    courseClickLogs: [createMockCourseClickLog({ courseId: baseCourseId })],
    metadata: null,
    createdAt: MOCK_TIMESTAMPS.START,
    updatedAt: MOCK_TIMESTAMPS.START,
    ...overrides,
  };
};

// ============================================================================
// LAYER 6: RELEVANCE RESULT
// ============================================================================

/**
 * Type-safe factory for RelevanceResult
 */
export const createMockRelevanceResult = (
  overrides: Partial<RelevanceResult> = {},
): RelevanceResult => ({
  score: 3,
  reason: 'Highly relevant course',
  ...overrides,
});

/**
 * Type-safe factory for CourseWithLearningOutcomeV2MatchWithRelevance
 * Extends CourseWithLearningOutcomeV2Match with relevance fields
 */
export const createMockCourseWithLearningOutcomeV2MatchWithRelevance = (
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
// LAYER 6B: AGGREGATED COURSE SKILLS
// ============================================================================

/**
 * Type-safe factory for MatchedSkillLearningOutcomes
 */
export const createMockMatchedSkillLearningOutcomes = (
  overrides: Partial<MatchedSkillLearningOutcomes> = {},
): MatchedSkillLearningOutcomes => ({
  skill: 'data analysis',
  relevanceScore: overrides.relevanceScore ?? 0.85,
  learningOutcomes: [
    createMockMatchedLearningOutcome({ loId: createMockId('lo-1') }),
    createMockMatchedLearningOutcome({ loId: createMockId('lo-2') }),
  ],
  ...overrides,
});

/**
 * Type-safe factory for AggregatedCourseSkills
 * This extends Course with matchedSkills and maxRelevanceScore
 * NOTE: This is a complex type requiring Course base + additional fields
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
    courseOfferings: [createMockCourseOffering({ courseId })],
    courseClickLogs: [createMockCourseClickLog({ courseId })],
    metadata: null,
    createdAt: MOCK_TIMESTAMPS.START,
    updatedAt: MOCK_TIMESTAMPS.START,
    matchedSkills: [
      createMockMatchedSkillLearningOutcomes({ skill: 'data analysis' }),
      createMockMatchedSkillLearningOutcomes({ skill: 'statistics' }),
    ],
    maxRelevanceScore: overrides.maxRelevanceScore ?? 0.9,
    ...overrides,
  };
};

// ============================================================================
// LAYER 7: MAP HELPERS
// ============================================================================

/**
 * Create a mock skill-to-courses mapping as an Object
 * (Maps are serialized to Objects for JSONB storage)
 */
export const createMockSkillCoursesObject = (): Record<
  string,
  CourseWithLOV2Match[]
> => ({
  'data analysis': [createMockCourseWithLearningOutcomeV2Match()],
  statistics: [createMockCourseWithLearningOutcomeV2Match()],
  python: [createMockCourseWithLearningOutcomeV2Match()],
});

/**
 * Create a mock skill-to-relevant-courses mapping as an Object
 */
export const createMockSkillRelevantCoursesObject = (): Record<
  string,
  CourseWithLearningOutcomeV2MatchWithRelevance[]
> => ({
  'data analysis': [createMockCourseWithLearningOutcomeV2MatchWithRelevance()],
});

/**
 * Create mock relevance Maps for CourseFilterRawOutput
 */
export const createMockRelevanceMaps = (): {
  llmAcceptedCoursesBySkill: Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >;
  llmRejectedCoursesBySkill: Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >;
  llmMissingCoursesBySkill: Map<
    string,
    CourseWithLearningOutcomeV2MatchWithRelevance[]
  >;
} => ({
  llmAcceptedCoursesBySkill: new Map([
    [
      'data analysis',
      [createMockCourseWithLearningOutcomeV2MatchWithRelevance()],
    ],
  ]),
  llmRejectedCoursesBySkill: new Map([
    [
      'statistics',
      [
        createMockCourseWithLearningOutcomeV2MatchWithRelevance({
          score: 0,
          reason: 'Not relevant',
        }),
      ],
    ],
  ]),
  llmMissingCoursesBySkill: new Map([
    [
      'python',
      [
        createMockCourseWithLearningOutcomeV2MatchWithRelevance({
          score: 0,
          reason: 'Missing from LLM response',
        }),
      ],
    ],
  ]),
});

// ============================================================================
// LAYER 8: LLM & EMBEDDING CONFIGS
// ============================================================================

/**
 * Type-safe factory for TokenUsage (shared contracts format)
 */
export const createMockTokenUsage = (
  overrides: Partial<TokenUsage> = {},
): TokenUsage => ({
  model: 'gpt-4',
  inputTokens: 100,
  outputTokens: 50,
  ...overrides,
});

/**
 * Type-safe factory for LlmInfo (shared contracts format)
 */
export const createMockLlmInfo = (
  overrides: Partial<LlmInfo> = {},
): LlmInfo => ({
  model: 'gpt-4',
  systemPrompt: 'You are a helpful assistant.',
  userPrompt: 'Test prompt',
  promptVersion: 'V10',
  ...overrides,
});

/**
 * Type-safe factory for StepLlmConfig (query logging format)
 */
export const createMockStepLlmConfig = (
  overrides: Partial<StepLlmConfig> = {},
): StepLlmConfig => ({
  provider: 'openai',
  model: 'gpt-4',
  promptVersion: 'V10',
  tokenUsage: {
    input: 100,
    output: 50,
    total: 150,
  },
  ...overrides,
});

/**
 * Type-safe factory for StepEmbeddingConfig
 */
export const createMockStepEmbeddingConfig = (
  overrides: Partial<StepEmbeddingConfig> = {},
): StepEmbeddingConfig => ({
  model: 'e5-base',
  provider: 'local',
  dimension: 768,
  totalTokens: 10,
  bySkill: [
    {
      skill: 'data analysis',
      model: 'e5-base',
      provider: 'local',
      dimension: 768,
      embeddedText: 'data analysis',
      generatedAt: MOCK_TIMESTAMPS.START.toISOString(),
      promptTokens: 5,
      totalTokens: 5,
    },
  ],
  skillsCount: 1,
  ...overrides,
});

// ============================================================================
// LAYER 7: COMPLEX RAW OUTPUT TYPES
// ============================================================================

/**
 * Type-safe factory for CourseRetrievalRawOutput
 */
export const createMockCourseRetrievalRawOutput = (
  overrides: Partial<CourseRetrievalRawOutput> = {},
): CourseRetrievalRawOutput => ({
  skills: ['data analysis', 'statistics'],
  skillCoursesMap: new Map([
    ['data analysis', [createMockCourseWithLearningOutcomeV2Match()]],
    ['statistics', [createMockCourseWithLearningOutcomeV2Match()]],
  ]),
  embeddingUsage: {
    bySkill: [
      {
        skill: 'data analysis',
        model: 'e5-base',
        provider: 'local',
        dimension: 768,
        promptTokens: 5,
        totalTokens: 5,
      },
      {
        skill: 'statistics',
        model: 'e5-base',
        provider: 'local',
        dimension: 768,
        promptTokens: 3,
        totalTokens: 3,
      },
    ],
    totalTokens: 8,
  },
  ...overrides,
});

/**
 * Type-safe factory for CourseFilterRawOutput (CourseRelevanceFilterResultV2)
 */
export const createMockCourseFilterRawOutput = (
  overrides: Partial<CourseFilterRawOutput> = {},
): CourseFilterRawOutput => {
  const relevanceMaps = createMockRelevanceMaps();

  return {
    llmAcceptedCoursesBySkill: relevanceMaps.llmAcceptedCoursesBySkill,
    llmRejectedCoursesBySkill: relevanceMaps.llmRejectedCoursesBySkill,
    llmMissingCoursesBySkill: relevanceMaps.llmMissingCoursesBySkill,
    llmInfo: createMockLlmInfo({ promptVersion: 'V5' }),
    tokenUsage: createMockTokenUsage(),
    ...overrides,
  };
};

/**
 * Type-safe factory for CourseAggregationRawOutput
 */
export const createMockCourseAggregationRawOutput = (
  overrides: Partial<CourseAggregationRawOutput> = {},
): CourseAggregationRawOutput => ({
  filteredSkillCoursesMap: new Map([
    [
      'data analysis',
      [createMockCourseWithLearningOutcomeV2MatchWithRelevance()],
    ],
  ]),
  rankedCourses: [createMockAggregatedCourseSkills()],
  ...overrides,
});

// ============================================================================
// LAYER 9: QUERY PROCESS STEP BUILDERS
// ============================================================================

/**
 * Base factory for QueryProcessStep
 */
export const createMockQueryProcessStepBase = (
  overrides: Partial<QueryProcessStep> = {},
): QueryProcessStep => ({
  id: createMockId('step-1'),
  queryLogId: createMockId('log-123'),
  stepName: STEP_NAME.SKILL_EXPANSION,
  stepOrder: 3,
  input: { question: 'Test question' },
  output: {
    raw: {
      skillItems: [{ skill: 'test skill', reason: 'test reason' }],
    },
  },
  llm: createMockStepLlmConfig(),
  embedding: null,
  metrics: null,
  error: null,
  startedAt: MOCK_TIMESTAMPS.START,
  completedAt: MOCK_TIMESTAMPS.START,
  duration: 1000,
  createdAt: MOCK_TIMESTAMPS.START,
  updatedAt: MOCK_TIMESTAMPS.START,
  ...overrides,
});

/**
 * Type-safe factory for Classification step
 */
export const createMockClassificationStep = (
  overrides: Partial<QueryProcessStep> = {},
): QueryProcessStep =>
  createMockQueryProcessStepBase({
    id: createMockId('step-classification'),
    stepName: STEP_NAME.QUESTION_CLASSIFICATION,
    stepOrder: 1,
    input: { question: 'What skills do I need for data analysis?' },
    output: {
      raw: createMockClassificationRawOutput(),
    },
    llm: createMockStepLlmConfig({
      promptVersion: 'V11',
      tokenUsage: { input: 50, output: 20, total: 70 },
    }),
    duration: 800,
    startedAt: MOCK_TIMESTAMPS.START,
    completedAt: MOCK_TIMESTAMPS.STEP_1_END,
    ...overrides,
  });

/**
 * Type-safe factory for SkillExpansion step
 */
export const createMockSkillExpansionStep = (
  overrides: Partial<QueryProcessStep> = {},
): QueryProcessStep =>
  createMockQueryProcessStepBase({
    id: createMockId('step-skill-expansion'),
    stepName: STEP_NAME.SKILL_EXPANSION,
    stepOrder: 3,
    input: { question: 'What skills do I need for data analysis?' },
    output: {
      raw: createMockSkillExpansionRawOutput(),
    },
    llm: createMockStepLlmConfig({
      promptVersion: 'V10',
      tokenUsage: { input: 100, output: 50, total: 150 },
    }),
    duration: 1500,
    startedAt: MOCK_TIMESTAMPS.STEP_3_START,
    completedAt: MOCK_TIMESTAMPS.STEP_3_END,
    ...overrides,
  });

/**
 * Type-safe factory for CourseRetrieval step
 */
export const createMockCourseRetrievalStep = (
  overrides: Partial<QueryProcessStep> = {},
): QueryProcessStep =>
  createMockQueryProcessStepBase({
    id: createMockId('step-course-retrieval'),
    stepName: STEP_NAME.COURSE_RETRIEVAL,
    stepOrder: 4,
    input: { skills: ['data analysis'] },
    output: {
      raw: createMockCourseRetrievalRawOutput(),
    },
    llm: undefined,
    embedding: createMockStepEmbeddingConfig(),
    duration: 2000,
    startedAt: MOCK_TIMESTAMPS.STEP_4_START,
    completedAt: MOCK_TIMESTAMPS.STEP_4_END,
    ...overrides,
  });

/**
 * Type-safe factory for CourseFilter step
 */
export const createMockCourseFilterStep = (
  overrides: Partial<QueryProcessStep> = {},
): QueryProcessStep =>
  createMockQueryProcessStepBase({
    id: createMockId('step-course-filter'),
    stepName: STEP_NAME.COURSE_RELEVANCE_FILTER,
    stepOrder: 5,
    input: {},
    output: {
      raw: createMockCourseFilterRawOutput(),
    },
    llm: createMockStepLlmConfig({
      promptVersion: 'V5',
      tokenUsage: { input: 200, output: 100, total: 300 },
    }),
    duration: 3000,
    startedAt: MOCK_TIMESTAMPS.STEP_4_END,
    completedAt: MOCK_TIMESTAMPS.STEP_5_END,
    ...overrides,
  });

/**
 * Type-safe factory for Aggregation step
 */
export const createMockAggregationStep = (
  overrides: Partial<QueryProcessStep> = {},
): QueryProcessStep =>
  createMockQueryProcessStepBase({
    id: createMockId('step-aggregation'),
    stepName: STEP_NAME.COURSE_AGGREGATION,
    stepOrder: 6,
    input: {},
    output: {
      raw: createMockCourseAggregationRawOutput(),
    },
    llm: undefined,
    embedding: undefined,
    duration: 500,
    startedAt: MOCK_TIMESTAMPS.STEP_5_END,
    completedAt: MOCK_TIMESTAMPS.STEP_6_END,
    ...overrides,
  });

/**
 * Type-safe factory for AnswerSynthesis step
 */
export const createMockAnswerSynthesisStep = (
  overrides: Partial<QueryProcessStep> = {},
): QueryProcessStep =>
  createMockQueryProcessStepBase({
    id: createMockId('step-answer-synthesis'),
    stepName: STEP_NAME.ANSWER_SYNTHESIS,
    stepOrder: 7,
    input: {},
    output: {
      raw: createMockAnswerSynthesisRawOutput(),
    },
    llm: createMockStepLlmConfig({
      promptVersion: 'V3',
      tokenUsage: { input: 300, output: 200, total: 500 },
    }),
    duration: 4000,
    startedAt: MOCK_TIMESTAMPS.STEP_6_END,
    completedAt: MOCK_TIMESTAMPS.STEP_7_END,
    ...overrides,
  });

// ============================================================================
// LAYER 10: QUERY PROCESS LOG & ENRICHED LOGS
// ============================================================================

/**
 * Base factory for QueryProcessLog
 */
export const createMockQueryProcessLogBase = (
  overrides: Partial<QueryProcessLogWithSteps> = {},
): QueryProcessLogWithSteps => ({
  id: createMockId('log-123'),
  status: 'COMPLETED',
  question: 'What skills do I need for data analysis?',
  input: { question: 'What skills do I need for data analysis?' },
  output: null,
  metrics: null,
  metadata: null,
  error: null,
  totalDuration: null,
  totalTokens: null,
  totalCost: null,
  startedAt: MOCK_TIMESTAMPS.START,
  completedAt: MOCK_TIMESTAMPS.STEP_7_END,
  createdAt: MOCK_TIMESTAMPS.START,
  updatedAt: MOCK_TIMESTAMPS.STEP_7_END,
  processSteps: [],
  ...overrides,
});

/**
 * Type-safe factory for complete mock enriched log
 * Returns QueryProcessLogWithSteps with all step properties at the top level
 *
 * This matches the enriched log types from TestSetTransformer:
 * - QueryLogWithClassification
 * - QueryLogWithSkillExpansion
 * - QueryLogWithCourseRetrieval
 * - QueryLogWithCourseFilter
 * - QueryLogWithAggregation
 * - QueryLogWithAnswerSynthesis
 */
export const createMockEnrichedLog = (): QueryProcessLogWithSteps & {
  classificationStep: QueryProcessStep;
  skillExpansionStep: QueryProcessStep;
  courseRetrievalStep: QueryProcessStep;
  courseFilterStep: QueryProcessStep;
  aggregationStep: QueryProcessStep;
  answerSynthesisStep: QueryProcessStep;
} => {
  const classificationStep = createMockClassificationStep();
  const skillExpansionStep = createMockSkillExpansionStep();
  const courseRetrievalStep = createMockCourseRetrievalStep();
  const courseFilterStep = createMockCourseFilterStep();
  const aggregationStep = createMockAggregationStep();
  const answerSynthesisStep = createMockAnswerSynthesisStep();

  const baseLog = createMockQueryProcessLogBase({
    processSteps: [
      classificationStep,
      skillExpansionStep,
      courseRetrievalStep,
      courseFilterStep,
      aggregationStep,
      answerSynthesisStep,
    ],
  });

  // Return enriched log with all step properties at top level
  return {
    ...baseLog,
    classificationStep,
    skillExpansionStep,
    courseRetrievalStep,
    courseFilterStep,
    aggregationStep,
    answerSynthesisStep,
  };
};

/**
 * Factory for creating enriched log with only SkillExpansion step
 */
export const createMockEnrichedLogWithSkillExpansion = (
  stepOverrides: Partial<QueryProcessStep> = {},
): QueryProcessLogWithSteps & {
  skillExpansionStep: QueryProcessStep;
} => {
  const skillExpansionStep = createMockSkillExpansionStep(stepOverrides);
  const baseLog = createMockQueryProcessLogBase({
    processSteps: [skillExpansionStep],
  });

  return {
    ...baseLog,
    skillExpansionStep,
  };
};

/**
 * Factory for creating enriched log with only Classification step
 */
export const createMockEnrichedLogWithClassification = (
  stepOverrides: Partial<QueryProcessStep> = {},
): QueryProcessLogWithSteps & {
  classificationStep: QueryProcessStep;
} => {
  const classificationStep = createMockClassificationStep(stepOverrides);
  const baseLog = createMockQueryProcessLogBase({
    processSteps: [classificationStep],
  });

  return {
    ...baseLog,
    classificationStep,
  };
};

/**
 * Factory for creating enriched log with only CourseRetrieval step
 */
export const createMockEnrichedLogWithCourseRetrieval = (
  stepOverrides: Partial<QueryProcessStep> = {},
): QueryProcessLogWithSteps & {
  courseRetrievalStep: QueryProcessStep;
} => {
  const courseRetrievalStep = createMockCourseRetrievalStep(stepOverrides);
  const baseLog = createMockQueryProcessLogBase({
    processSteps: [courseRetrievalStep],
  });

  return {
    ...baseLog,
    courseRetrievalStep,
  };
};

/**
 * Factory for creating enriched log with only CourseFilter step
 * NOTE: This creates a single filter step - use createMockEnrichedLogWithCourseFilterGrouped for multiple skills
 */
export const createMockEnrichedLogWithCourseFilter = (
  stepOverrides: Partial<QueryProcessStep> = {},
): QueryProcessLogWithSteps & {
  courseFilterStep: QueryProcessStep;
} => {
  const courseFilterStep = createMockCourseFilterStep(stepOverrides);
  const baseLog = createMockQueryProcessLogBase({
    processSteps: [courseFilterStep],
  });

  return {
    ...baseLog,
    courseFilterStep,
  };
};

/**
 * Factory for creating enriched log with CourseFilter step (merged structure)
 * Simulates the transformer's NEW merged structure for COURSE_RELEVANCE_FILTER
 *
 * Creates a SINGLE step with allSkillsMetrics array (one entry per skill)
 */
export const createMockEnrichedLogWithCourseFilterGrouped = (
  stepOverrides: Partial<QueryProcessStep> = {},
  skillCount: number = 3,
): QueryProcessLogWithSteps & {
  courseFilterSteps: QueryProcessStep[];
} => {
  // Build allSkillsMetrics array with per-skill data
  const allSkillsMetrics = Array.from({ length: skillCount }, (_, i) => ({
    skill: `skill-${i + 1}`,
    inputCount: 10 + i,
    acceptedCourses: [
      {
        courseCode: `CS${100 + i}`,
        courseName: `Course ${i + 1}`,
        score: 3,
        reason: 'Highly relevant',
        matchedLos: [
          {
            id: `lo-${i + 1}`,
            name: `Learning Outcome ${i + 1}`,
          },
        ],
      },
    ],
    rejectedCourses: [
      {
        courseCode: `CS${200 + i}`,
        courseName: `Rejected Course ${i + 1}`,
        score: 0,
        reason: 'Not relevant',
        matchedLos: [],
      },
    ],
    missingCourses: [
      {
        courseCode: `CS${300 + i}`,
        courseName: `Missing Course ${i + 1}`,
        score: 0,
        reason: 'Missing from LLM response',
        matchedLos: [],
      },
    ],
    acceptedCount: 1,
    rejectedCount: 1,
    missingCount: 1,
    llmDecisionRate: 0.6 + i * 0.1,
    llmRejectionRate: 0.5,
    llmFallbackRate: 0.3,
    scoreDistribution: {
      score1: 1,
      score2: i,
      score3: 0,
    },
    avgScore: 2.5,
    // Per-skill LLM info (each skill has its own concurrent LLM call)
    llmInfo: {
      model: 'gpt-4',
      provider: 'openai',
      promptVersion: 'V5',
      systemPrompt: 'You are a helpful assistant',
      userPrompt: 'Filter courses for relevance',
    },
    // Per-skill token usage
    tokenUsage: {
      input: 200,
      output: 100,
      total: 300,
    },
  }));

  // Create SINGLE filter step with merged metrics
  const courseFilterStep = createMockCourseFilterStep({
    ...stepOverrides,
    id: createMockId('step-course-filter-1'),
    input: {
      skills: allSkillsMetrics.map((m) => m.skill),
      skillCount: allSkillsMetrics.length,
      question: 'What skills do I need for data analysis?',
    },
    output: {
      raw: createMockCourseFilterRawOutput(),
      metrics: {
        allSkillsMetrics,
        summary: {
          totalSkills: skillCount,
          totalAccepted: skillCount,
          totalRejected: skillCount,
          totalMissing: skillCount,
          overallAvgScore: 2.5,
        },
      } as unknown as ServiceMetrics, // Cast to ServiceMetrics type
    },
    // Step-level llm is now undefined (per-skill llmInfo is in allSkillsMetrics)
    llm: undefined,
  });

  const baseLog = createMockQueryProcessLogBase({
    processSteps: [courseFilterStep],
  });

  return {
    ...baseLog,
    courseFilterSteps: [courseFilterStep], // Single step in array for compatibility
  };
};

/**
 * Factory for creating enriched log with only Aggregation step
 */
export const createMockEnrichedLogWithAggregation = (
  stepOverrides: Partial<QueryProcessStep> = {},
): QueryProcessLogWithSteps & {
  aggregationStep: QueryProcessStep;
} => {
  const aggregationStep = createMockAggregationStep(stepOverrides);
  const baseLog = createMockQueryProcessLogBase({
    processSteps: [aggregationStep],
  });

  return {
    ...baseLog,
    aggregationStep,
  };
};

/**
 * Factory for creating enriched log with only AnswerSynthesis step
 */
export const createMockEnrichedLogWithAnswerSynthesis = (
  stepOverrides: Partial<QueryProcessStep> = {},
): QueryProcessLogWithSteps & {
  answerSynthesisStep: QueryProcessStep;
} => {
  const answerSynthesisStep = createMockAnswerSynthesisStep(stepOverrides);
  const baseLog = createMockQueryProcessLogBase({
    processSteps: [answerSynthesisStep],
  });

  return {
    ...baseLog,
    answerSynthesisStep,
  };
};

// ============================================================================
// LAYER 11: EDGE CASE VARIATIONS
// ============================================================================

/**
 * Create enriched log with empty skill items array
 */
export const createMockEnrichedLogWithEmptySkills =
  (): QueryProcessLogWithSteps & {
    skillExpansionStep: QueryProcessStep;
  } => {
    return createMockEnrichedLogWithSkillExpansion({
      output: {
        raw: createMockSkillExpansionRawOutput({ skillItems: [] }),
      },
    });
  };

/**
 * Create enriched log with missing optional LLM fields
 */
export const createMockEnrichedLogWithMissingOptionalFields =
  (): QueryProcessLogWithSteps & {
    skillExpansionStep: QueryProcessStep;
  } => {
    return createMockEnrichedLogWithSkillExpansion({
      llm: undefined,
      output: {
        raw: createMockSkillExpansionRawOutput(),
      },
    });
  };
