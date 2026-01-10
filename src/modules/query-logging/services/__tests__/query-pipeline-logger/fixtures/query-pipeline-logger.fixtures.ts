import type { EmbeddingUsage } from '../../../../../../shared/contracts/types/embedding-usage.type';
import type { Identifier } from '../../../../../../shared/contracts/types/identifier';
import type { LlmInfo } from '../../../../../../shared/contracts/types/llm-info.type';
import type { IQueryLoggingRepository } from '../../../../contracts/i-query-logging-repository.contract';
import type { QueryProcessStep } from '../../../../types/query-log-step.type';
import type { QueryProcessLogWithSteps } from '../../../../types/query-log-step.type';
import type {
  QueryLogInput,
  QueryLogMetrics,
  QueryLogOutput,
  QueryProcessLog,
} from '../../../../types/query-log.type';

// Helper to create Identifier from string for tests
export const toId = (id: string): Identifier => id as Identifier;

// Test constants
export const mockQueryLogId = toId('query-log-123');
export const mockStepId = toId('step-123');

// Create a mock repository with all methods as jest fns
export const createMockRepository =
  (): jest.Mocked<IQueryLoggingRepository> => ({
    createQueryLog: jest.fn(),
    createStep: jest.fn(),
    findStepById: jest.fn(),
    updateStep: jest.fn(),
    updateQueryLog: jest.fn(),
    findQueryLogById: jest.fn(),
    findLastQueryLog: jest.fn(),
    findMany: jest.fn(),
  });

// Create a mock QueryProcessLog with defaults
export const createMockQueryLog = (
  overrides: Partial<QueryProcessLog> = {},
): QueryProcessLog => ({
  id: mockQueryLogId,
  status: 'PENDING',
  question: 'Test question',
  startedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Create a mock QueryProcessStep with defaults
export const createMockStep = (
  overrides: Partial<QueryProcessStep> = {},
): QueryProcessStep => ({
  id: mockStepId,
  queryLogId: mockQueryLogId,
  stepName: 'QUESTION_CLASSIFICATION',
  stepOrder: 1,
  startedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// Create a mock QueryProcessLogWithSteps for getFullLog tests
export const createMockLogWithSteps = (
  overrides: Partial<QueryProcessLogWithSteps> = {},
): QueryProcessLogWithSteps => ({
  id: mockQueryLogId,
  status: 'COMPLETED',
  question: 'Test question',
  startedAt: new Date(),
  completedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  processSteps: [],
  ...overrides,
});

// Create mock LlmInfo with common defaults
export const createMockLlmInfo = (
  overrides: Partial<LlmInfo> = {},
): LlmInfo => ({
  model: 'openai/gpt-4o-mini',
  provider: 'openrouter',
  systemPrompt: 'Test system prompt',
  userPrompt: 'Test user prompt',
  promptVersion: '1.0',
  ...overrides,
});

// Create mock EmbeddingUsage
export const createMockEmbeddingUsage = (
  skill: string,
  overrides: Partial<EmbeddingUsage> = {},
): EmbeddingUsage => ({
  bySkill: [
    {
      skill,
      model: 'e5-base',
      provider: 'local',
      dimension: 768,
      embeddedText: skill,
      generatedAt: new Date().toISOString(),
      promptTokens: 2,
      totalTokens: 2,
    },
  ],
  totalTokens: 2,
  ...overrides,
});

// Create mock QueryLogInput
export const createMockQueryLogInput = (
  overrides: Partial<QueryLogInput> = {},
): QueryLogInput => ({
  question: 'Test question',
  campusId: 'campus-1',
  facultyId: 'faculty-1',
  isGenEd: false,
  ...overrides,
});

// Create mock QueryLogOutput
export const createMockQueryLogOutput = (
  overrides: Partial<QueryLogOutput> = {},
): QueryLogOutput => ({
  answer: 'Test answer',
  relatedCourses: [{ courseCode: 'CS101', courseName: 'Intro to CS' }],
  ...overrides,
});

// Create mock QueryLogMetrics
export const createMockQueryLogMetrics = (
  overrides: Partial<QueryLogMetrics> = {},
): QueryLogMetrics => ({
  totalDuration: 5000,
  tokens: {
    llm: {
      input: 1000,
      output: 500,
      total: 1500,
    },
    total: 1500,
  },
  counts: {
    coursesReturned: 10,
  },
  ...overrides,
});
