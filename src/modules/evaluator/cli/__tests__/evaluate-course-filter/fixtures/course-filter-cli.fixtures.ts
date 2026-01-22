import type { Identifier } from 'src/shared/contracts/types/identifier';

import type { CourseFilterTestSetSerialized } from '../../../../shared/services/test-set.types';

// Helper to create Identifier from string for tests
const toId = (id: string): Identifier => id as Identifier;
const now = new Date();

/**
 * Create a mock learning outcome
 */
const createMockLO = (id: string, name: string) => ({
  loId: toId(id),
  originalName: name,
  cleanedName: name,
  skipEmbedding: false,
  hasEmbedding768: true,
  hasEmbedding1536: false,
  similarityScore: 0.85,
  createdAt: now,
  updatedAt: now,
});

/**
 * Create a mock course with relevance score
 */
const createMockCourse = (
  id: string,
  code: string,
  name: string,
  score: 0 | 1 | 2 | 3,
) => ({
  id: toId(id),
  subjectCode: code,
  subjectName: name,
  isGenEd: false,
  campusId: toId('campus-001'),
  facultyId: toId('faculty-001'),
  matchedLearningOutcomes: [createMockLO('lo-1', 'Understand AI')],
  remainingLearningOutcomes: [],
  allLearningOutcomes: [
    createMockLO('lo-1', 'Understand AI'),
    createMockLO('lo-2', 'Build neural networks'),
  ],
  score,
  reason: `Score ${score} reason`,
  courseOfferings: [],
  courseClickLogs: [],
  metadata: { createdAt: now, updatedAt: now },
  createdAt: now,
  updatedAt: now,
});

/**
 * Create a minimal mock test set entry for course filter evaluation
 */
export function createMockCourseFilterTestSet(overrides?: {
  queryLogId?: string;
  question?: string;
}): CourseFilterTestSetSerialized[] {
  const queryLogId = overrides?.queryLogId ?? 'test-query-log-1';
  const question = overrides?.question ?? 'What are the best AI courses?';

  return [
    {
      queryLogId,
      question,
      llmModel: 'openai/gpt-4o-mini',
      llmProvider: 'openrouter',
      promptVersion: '1.0',
      duration: 1500,
      rawOutput: {
        llmAcceptedCoursesBySkill: {
          'machine learning': [
            createMockCourse('course-1', 'CS101', 'Intro to AI', 3),
            createMockCourse('course-2', 'CS102', 'Data Structures', 2),
          ],
        },
        llmRejectedCoursesBySkill: {
          'machine learning': [
            createMockCourse('course-3', 'ENG101', 'English', 0),
          ],
        },
        llmMissingCoursesBySkill: {},
      },
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
          inputCount: 3,
          acceptedCount: 2,
          rejectedCount: 1,
          missingCount: 0,
          llmDecisionRate: 1.0,
          llmRejectionRate: 0.33,
          llmFallbackRate: 0.0,
          scoreDistribution: { score1: 0, score2: 1, score3: 1 },
          avgScore: 1.67,
          stepId: 'step-1',
        },
      },
    },
  ];
}

/**
 * Create a test set with multiple entries for testing aggregation
 */
export function createMultiEntryTestSet(): CourseFilterTestSetSerialized[] {
  return [
    ...createMockCourseFilterTestSet({
      queryLogId: 'query-1',
      question: 'What are the best Python courses?',
    }),
    ...createMockCourseFilterTestSet({
      queryLogId: 'query-2',
      question: 'How to learn web development?',
    }),
    ...createMockCourseFilterTestSet({
      queryLogId: 'query-3',
      question: 'Teach me machine learning',
    }),
  ];
}

/**
 * Create a test set with various edge cases
 */
export function createEdgeCaseTestSet(): CourseFilterTestSetSerialized[] {
  return [
    {
      queryLogId: 'edge-empty-courses',
      question: 'Test with no courses',
      llmModel: 'openai/gpt-4o-mini',
      llmProvider: 'openrouter',
      promptVersion: '1.0',
      duration: 500,
      rawOutput: {
        llmAcceptedCoursesBySkill: {},
        llmRejectedCoursesBySkill: {},
        llmMissingCoursesBySkill: {},
      },
      llmInfoBySkill: {},
      totalTokenUsage: { input: 0, output: 0, total: 0 },
      tokenUsageBySkill: {},
      metricsBySkill: {},
    },
    {
      queryLogId: 'edge-only-rejected',
      question: 'Test with only rejected courses',
      llmModel: 'openai/gpt-4o-mini',
      llmProvider: 'openrouter',
      promptVersion: '1.0',
      duration: 800,
      rawOutput: {
        llmAcceptedCoursesBySkill: {},
        llmRejectedCoursesBySkill: {
          'some skill': [
            createMockCourse('course-1', 'ENG101', 'English', 0),
            createMockCourse('course-2', 'HIST101', 'History', 0),
          ],
        },
        llmMissingCoursesBySkill: {},
      },
      llmInfoBySkill: {
        'some skill': {
          model: 'openai/gpt-4o-mini',
          provider: 'openrouter',
          systemPrompt: 'Test',
          userPrompt: 'Test',
          promptVersion: '1.0',
        },
      },
      totalTokenUsage: { input: 50, output: 25, total: 75 },
      tokenUsageBySkill: {
        'some skill': { input: 50, output: 25, total: 75 },
      },
      metricsBySkill: {
        'some skill': {
          inputCount: 2,
          acceptedCount: 0,
          rejectedCount: 2,
          missingCount: 0,
          llmDecisionRate: 1.0,
          llmRejectionRate: 1.0,
          llmFallbackRate: 0.0,
          scoreDistribution: { score1: 0, score2: 0, score3: 0 },
          stepId: 'step-1',
        },
      },
    },
    {
      queryLogId: 'edge-special-chars',
      question: '¿Cómo aprender Python? (日本語) 🚀',
      llmModel: 'openai/gpt-4o-mini',
      llmProvider: 'openrouter',
      promptVersion: '1.0',
      duration: 1200,
      rawOutput: {
        llmAcceptedCoursesBySkill: {
          python: [
            createMockCourse('course-1', 'CS-PY-101', 'Python Basics', 3),
          ],
        },
        llmRejectedCoursesBySkill: {},
        llmMissingCoursesBySkill: {},
      },
      llmInfoBySkill: {
        python: {
          model: 'openai/gpt-4o-mini',
          provider: 'openrouter',
          systemPrompt: 'Test',
          userPrompt: 'Test',
          promptVersion: '1.0',
        },
      },
      totalTokenUsage: { input: 80, output: 40, total: 120 },
      tokenUsageBySkill: {
        python: { input: 80, output: 40, total: 120 },
      },
      metricsBySkill: {
        python: {
          inputCount: 1,
          acceptedCount: 1,
          rejectedCount: 0,
          missingCount: 0,
          llmDecisionRate: 1.0,
          llmRejectionRate: 0.0,
          llmFallbackRate: 0.0,
          scoreDistribution: { score1: 0, score2: 0, score3: 1 },
          stepId: 'step-1',
        },
      },
    },
  ];
}

/**
 * Test directory path for CLI tests
 */
export const CLI_TEST_DIR = '.temp-course-filter-cli-test';

/**
 * Test set filename for CLI tests
 */
export const CLI_TEST_SET_FILENAME = 'course-filter-test-set.json';
