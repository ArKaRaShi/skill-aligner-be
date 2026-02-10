import type { Identifier } from 'src/shared/contracts/types/identifier';

import type {
  LearningOutcome,
  MatchedLearningOutcome,
} from 'src/modules/course/types/course-learning-outcome-v2.type';
import type { CourseWithLearningOutcomeV2MatchWithRelevance } from 'src/modules/query-processor/types/course-aggregation.type';

import type { CourseFilterTestSetSerialized } from '../../../../shared/services/test-set.types';
import type {
  AggregatedCourseForEval,
  QuestionEvalSample,
  SystemAction,
  SystemRelevanceScore,
} from '../../../types/course-relevance-filter.types';

/**
 * Test fixtures for CourseFilterTestSetTransformer tests.
 */

// Helper to create Identifier from string for tests
const toId = (id: string): Identifier => id as Identifier;

/**
 * Create a mock matched learning outcome with similarity score.
 */
export function createMockMatchedLearningOutcome(
  overrides: {
    loId?: string;
    cleanedName?: string;
    similarityScore?: number;
  } = {},
): MatchedLearningOutcome {
  const loId = toId(overrides.loId ?? 'lo-1');
  return {
    loId,
    originalName: overrides.cleanedName ?? 'Understand fundamental concepts',
    cleanedName: overrides.cleanedName ?? 'Understand fundamental concepts',
    skipEmbedding: false,
    hasEmbedding768: true,
    hasEmbedding1536: false,
    similarityScore: overrides.similarityScore ?? 0.85,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create a mock learning outcome (without similarity score).
 */
export function createMockLearningOutcome(
  overrides: {
    loId?: string;
    cleanedName?: string;
  } = {},
): LearningOutcome {
  const loId = toId(overrides.loId ?? 'lo-1');
  return {
    loId,
    originalName: overrides.cleanedName ?? 'Understand fundamental concepts',
    cleanedName: overrides.cleanedName ?? 'Understand fundamental concepts',
    skipEmbedding: false,
    hasEmbedding768: true,
    hasEmbedding1536: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Create a mock course with relevance score.
 */
export function createMockCourse(
  overrides: {
    subjectCode?: string;
    subjectName?: string;
    score?: SystemRelevanceScore;
    reason?: string;
    matchedLearningOutcomes?: MatchedLearningOutcome[];
    allLearningOutcomes?: LearningOutcome[];
  } = {},
): CourseWithLearningOutcomeV2MatchWithRelevance {
  const defaultMatchedLOs = [
    createMockMatchedLearningOutcome({
      loId: 'lo-1',
      cleanedName: 'Understand AI',
    }),
    createMockMatchedLearningOutcome({ loId: 'lo-2', cleanedName: 'Learn ML' }),
  ];

  const defaultAllLOs = [
    createMockLearningOutcome({ loId: 'lo-1', cleanedName: 'Understand AI' }),
    createMockLearningOutcome({ loId: 'lo-2', cleanedName: 'Learn ML' }),
    createMockLearningOutcome({
      loId: 'lo-3',
      cleanedName: 'Build neural networks',
    }),
  ];

  const now = new Date();

  return {
    id: toId('course-1'),
    campusId: toId('campus-1'),
    facultyId: toId('faculty-1'),
    subjectCode: overrides.subjectCode ?? 'CS101',
    subjectName: overrides.subjectName ?? 'Introduction to Computer Science',
    isGenEd: false,
    matchedLearningOutcomes:
      overrides.matchedLearningOutcomes ?? defaultMatchedLOs,
    remainingLearningOutcomes: [],
    allLearningOutcomes: overrides.allLearningOutcomes ?? defaultAllLOs,
    score: overrides.score ?? 3,
    reason: overrides.reason ?? 'Highly relevant course',
    courseOfferings: [],
    courseClickLogs: [],
    metadata: { createdAt: now, updatedAt: now },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create a mock test set entry.
 */
export function createMockTestSetEntry(
  overrides: {
    queryLogId?: string;
    question?: string;
    rawOutput?: CourseFilterTestSetSerialized['rawOutput'];
  } = {},
): CourseFilterTestSetSerialized {
  const defaultRawOutput: CourseFilterTestSetSerialized['rawOutput'] = {
    llmAcceptedCoursesBySkill: {
      'machine learning': [
        createMockCourse({
          subjectCode: 'CS101',
          score: 3,
          reason: 'Direct match for ML concepts',
        }),
      ],
    },
    llmRejectedCoursesBySkill: {
      'machine learning': [
        createMockCourse({
          subjectCode: 'ENG101',
          score: 0,
          reason: 'Not relevant to ML',
        }),
      ],
    },
    llmMissingCoursesBySkill: {},
  };

  return {
    queryLogId: overrides.queryLogId ?? 'query-log-1',
    question: overrides.question ?? 'What courses teach AI?',
    llmModel: 'openai/gpt-4o-mini',
    llmProvider: 'openrouter',
    promptVersion: '1.0',
    duration: 1500,
    rawOutput:
      'rawOutput' in overrides ? overrides.rawOutput : defaultRawOutput,
    llmInfoBySkill: {
      'machine learning': {
        model: 'openai/gpt-4o-mini',
        provider: 'openrouter',
        systemPrompt: 'Test',
        userPrompt: 'Test',
        promptVersion: '1.0',
      },
    },
    totalTokenUsage: { input: 100, output: 50, total: 150 },
    tokenUsageBySkill: {
      'machine learning': { input: 100, output: 50, total: 150 },
    },
    metricsBySkill: {
      'machine learning': {
        inputCount: 10,
        acceptedCount: 8,
        rejectedCount: 2,
        missingCount: 0,
        llmDecisionRate: 1.0,
        llmRejectionRate: 0.2,
        llmFallbackRate: 0.0,
        scoreDistribution: { score1: 2, score2: 3, score3: 3 },
        avgScore: 2.3,
        stepId: 'step-1',
      },
    },
  };
}

/**
 * Create expected aggregated course for evaluation.
 */
export function createExpectedAggregatedCourse(
  overrides: {
    subjectCode?: string;
    subjectName?: string;
    systemScore?: SystemRelevanceScore;
    systemReason?: string;
    matchedSkills?: Array<{
      skill: string;
      score: SystemRelevanceScore;
      learningOutcomes: Array<{ id: string; name: string }>;
    }>;
    allLearningOutcomes?: Array<{ id: string; name: string }>;
  } = {},
): AggregatedCourseForEval {
  const score = overrides.systemScore ?? 3;
  return {
    subjectCode: overrides.subjectCode ?? 'CS101',
    subjectName: overrides.subjectName ?? 'Introduction to Computer Science',
    systemAction: (score > 0 ? 'KEEP' : 'DROP') as SystemAction,
    systemScore: score,
    systemReason: overrides.systemReason ?? 'Highly relevant course',
    matchedSkills: overrides.matchedSkills ?? [
      {
        skill: 'machine learning',
        score: 3,
        learningOutcomes: [
          { id: 'lo-1', name: 'Understand AI' },
          { id: 'lo-2', name: 'Learn ML' },
        ],
      },
    ],
    allLearningOutcomes: overrides.allLearningOutcomes ?? [
      { id: 'lo-1', name: 'Understand AI' },
      { id: 'lo-2', name: 'Learn ML' },
      { id: 'lo-3', name: 'Build neural networks' },
    ],
  };
}

/**
 * Create expected question evaluation sample.
 */
export function createExpectedQuestionSample(
  overrides: {
    queryLogId?: string;
    question?: string;
    courses?: AggregatedCourseForEval[];
  } = {},
): QuestionEvalSample {
  return {
    queryLogId: overrides.queryLogId ?? 'query-log-1',
    question: overrides.question ?? 'What courses teach AI?',
    courses: overrides.courses ?? [createExpectedAggregatedCourse()],
  };
}
