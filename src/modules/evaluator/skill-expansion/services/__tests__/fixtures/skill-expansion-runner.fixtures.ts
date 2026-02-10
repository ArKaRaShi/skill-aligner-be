import type {
  QuestionEvalSample,
  SampleEvaluationRecord,
  SkillExpansionJudgeResult,
  SkillExpansionMetrics,
  SkillExpansionTestSet,
} from '../../../types/skill-expansion.types';

// ============================================================================
// TEST DATA FIXTURES FOR SKILL EXPANSION RUNNER
// ============================================================================

/**
 * Create a mock skill item
 */
export const createMockSkillItem = (
  overrides: Partial<QuestionEvalSample['systemSkills'][0]> = {},
): QuestionEvalSample['systemSkills'][0] => ({
  skill: 'Object-Oriented Programming',
  reason: 'User asked about OOP',
  learningOutcome: 'Understand OOP principles',
  ...overrides,
});

/**
 * Create a mock question eval sample
 */
export const createMockQuestionSample = (
  overrides: Partial<QuestionEvalSample> = {},
): QuestionEvalSample => ({
  queryLogId: 'ql-123',
  question: 'What is OOP?',
  systemSkills: [createMockSkillItem()],
  ...overrides,
});

/**
 * Create a mock test set
 */
export const createMockTestSet = (
  overrides: Partial<SkillExpansionTestSet> = {},
): SkillExpansionTestSet => ({
  name: 'test-set-v1',
  cases: [
    {
      queryLogId: 'ql-1',
      question: 'What is OOP?',
      rawOutput: {
        skillItems: [createMockSkillItem()],
      },
    },
  ],
  ...overrides,
});

/**
 * Create a mock judge result
 */
export const createMockJudgeResult = (
  overrides: Partial<SkillExpansionJudgeResult> = {},
): SkillExpansionJudgeResult => ({
  result: {
    skills: [
      {
        skill: 'Object-Oriented Programming',
        verdict: 'PASS',
        note: 'Valid technical competency',
      },
    ],
    overall: {
      conceptPreserved: true,
      summary: 'Good skill',
    },
  },
  tokenUsage: [
    {
      model: 'gpt-4o-mini',
      inputTokens: 100,
      outputTokens: 50,
    },
  ],
  ...overrides,
});

/**
 * Create a mock sample evaluation record
 */
export const createMockSampleRecord = (
  overrides: Partial<SampleEvaluationRecord> = {},
): SampleEvaluationRecord => ({
  queryLogId: 'ql-123',
  question: 'What is OOP?',
  comparison: {
    question: 'What is OOP?',
    skills: [
      {
        question: 'What is OOP?',
        systemSkill: 'Object-Oriented Programming',
        systemReason: 'User asked about OOP',
        systemLearningOutcome: 'Understand OOP principles',
        judgeVerdict: 'PASS',
        judgeNote: 'Valid technical competency',
        agreementType: 'AGREE',
      },
    ],
    overall: {
      conceptPreserved: true,
      agreementCount: 1,
      disagreementCount: 0,
      totalSkills: 1,
    },
  },
  judgeResult: createMockJudgeResult(),
  evaluatedAt: new Date().toISOString(),
  ...overrides,
});

/**
 * Create a mock metrics file
 */
export const createMockMetricsFile = (
  overrides: Partial<SkillExpansionMetrics> = {},
): SkillExpansionMetrics & { iteration: number; timestamp: string } => ({
  iteration: 1,
  timestamp: new Date().toISOString(),
  totalSkills: 10,
  passedSkills: 8,
  passRate: 0.8,
  totalQuestions: 5,
  conceptPreservedQuestions: 4,
  conceptPreservationRate: 0.8,
  agreedSkills: 8,
  totalEvaluatedSkills: 10,
  overallAgreementRate: 0.8,
  skillCountDistribution: { 2: 5 },
  truePositives: 8,
  falsePositives: 2,
  ...overrides,
});

/**
 * Create a mock progress file
 */
export const createMockProgressFile = () => ({
  testSetName: 'test-set-v1',
  iterationNumber: 1,
  entries: [],
  lastUpdated: new Date().toISOString(),
  statistics: {
    totalItems: 0,
    completedItems: 0,
    pendingItems: 0,
    completionPercentage: 0,
  },
});
