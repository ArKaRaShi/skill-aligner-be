import * as path from 'node:path';
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';

import {
  ClassClassificationMetrics,
  OverallClassificationMetrics,
  QuestionClassificationTestRecord,
  QuestionClassificationTestResults,
} from '../../types/test-result.type';

// Re-export types for convenience
export type { LlmInfo };
export type {
  ClassClassificationMetrics,
  OverallClassificationMetrics,
  QuestionClassificationTestRecord,
  QuestionClassificationTestResults,
};

/**
 * Fixed timestamp for deterministic test data
 */
export const MOCK_TIMESTAMP = '2023-01-01T00:00:00.000Z' as const;

/**
 * Base directory for evaluation data
 */
const EVALUATION_BASE_DIR = 'data/evaluation/question-classification';

/**
 * Type-safe factory for creating LlmInfo objects
 */
export const createMockLlmInfo = (
  overrides: Partial<LlmInfo> = {},
): LlmInfo => ({
  model: 'test-model',
  userPrompt: 'test user prompt',
  systemPrompt: 'test-system-prompt',
  promptVersion: 'v1',
  ...overrides,
});

/**
 * Type-safe factory for creating QuestionClassificationTestRecord objects
 */
export const createMockTestRecord = (
  overrides: Partial<QuestionClassificationTestRecord> = {},
): QuestionClassificationTestRecord => ({
  question: 'test question',
  expectedClassification: 'relevant',
  actualClassification: 'relevant',
  reasoning: 'test reasoning',
  isCorrect: true,
  metadata: {
    model: 'test-model',
    hashedSystemPrompt: 'hashed-system-prompt',
    userPrompt: 'user prompt',
    promptVersion: 'v1',
    timestamp: MOCK_TIMESTAMP,
  },
  ...overrides,
});

/**
 * Type-safe factory for creating ClassClassificationMetrics objects
 */
export const createMockClassMetric = (
  overrides: Partial<ClassClassificationMetrics> = {},
): ClassClassificationMetrics => ({
  classLabel: 'relevant',
  totalQuestions: 0,
  correctClassifications: 0,
  incorrectClassifications: 0,
  precision: 0,
  recall: 0,
  macroPrecision: 0,
  macroRecall: 0,
  timestamp: MOCK_TIMESTAMP,
  ...overrides,
});

/**
 * Type-safe factory for creating OverallClassificationMetrics objects
 */
export const createMockOverallMetrics = (
  overrides: Partial<OverallClassificationMetrics> = {},
): OverallClassificationMetrics => ({
  totalQuestions: 0,
  totalCorrectClassifications: 0,
  totalIncorrectClassifications: 0,
  overallPrecision: 0,
  overallRecall: 0,
  macroPrecision: 0,
  macroRecall: 0,
  timestamp: MOCK_TIMESTAMP,
  ...overrides,
});

/**
 * Type-safe factory for creating QuestionClassificationTestResults objects
 */
export const createMockTestResult = (
  overrides: Partial<QuestionClassificationTestResults> = {},
): QuestionClassificationTestResults => ({
  records: [],
  classMetrics: [],
  overallMetrics: createMockOverallMetrics(),
  macroMetricsPerIteration: [],
  iterationNumber: 1,
  timestamp: MOCK_TIMESTAMP,
  ...overrides,
});

/**
 * Helper to build expected evaluation file paths
 */
export const getExpectedEvaluationPath = (
  prefixDir: string,
  ...segments: string[]
): string => {
  const parts = [EVALUATION_BASE_DIR];
  if (prefixDir) {
    parts.push(prefixDir);
  }
  if (segments.length > 0) {
    parts.push(...segments);
  }
  return path.join(...parts);
};

/**
 * Pre-configured mock data for common test scenarios
 */
export const MOCK_SCENARIOS = {
  singleIteration: {
    overallMetrics: createMockOverallMetrics({
      totalQuestions: 15,
      totalCorrectClassifications: 10,
      totalIncorrectClassifications: 5,
      overallPrecision: 0.7,
      overallRecall: 0.7,
      macroPrecision: 0.7,
      macroRecall: 0.7,
    }),
    classMetrics: [
      createMockClassMetric({
        classLabel: 'relevant',
        totalQuestions: 5,
        correctClassifications: 4,
        incorrectClassifications: 1,
        precision: 0.8,
        recall: 0.8,
      }),
      createMockClassMetric({
        classLabel: 'irrelevant',
        totalQuestions: 5,
        correctClassifications: 3,
        incorrectClassifications: 2,
        precision: 0.6,
        recall: 0.6,
      }),
      createMockClassMetric({
        classLabel: 'dangerous',
        totalQuestions: 3,
        correctClassifications: 2,
        incorrectClassifications: 1,
        precision: 0.5,
        recall: 0.67,
      }),
    ],
  },

  multipleIterations: {
    iteration1: {
      overallMetrics: createMockOverallMetrics({
        totalQuestions: 10,
        totalCorrectClassifications: 7,
        totalIncorrectClassifications: 3,
        overallPrecision: 0.7,
        overallRecall: 0.8,
        macroPrecision: 0.7,
        macroRecall: 0.8,
      }),
    },
    iteration2: {
      overallMetrics: createMockOverallMetrics({
        totalQuestions: 10,
        totalCorrectClassifications: 8,
        totalIncorrectClassifications: 2,
        overallPrecision: 0.8,
        overallRecall: 0.9,
        macroPrecision: 0.8,
        macroRecall: 0.9,
      }),
    },
    iteration3: {
      overallMetrics: createMockOverallMetrics({
        totalQuestions: 10,
        totalCorrectClassifications: 6,
        totalIncorrectClassifications: 4,
        overallPrecision: 0.6,
        overallRecall: 0.7,
        macroPrecision: 0.6,
        macroRecall: 0.7,
      }),
    },
  },
} as const;
