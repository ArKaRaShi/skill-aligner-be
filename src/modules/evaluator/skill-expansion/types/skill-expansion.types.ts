import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

// ============================================================================
// TEST SET TYPES
// ============================================================================

/**
 * Single test case entry for skill expansion evaluation
 */
export type SkillExpansionTestSetEntry = {
  queryLogId: string;
  question: string;
  rawOutput: SkillExpansionRawOutput;
};

/**
 * Raw system output from SkillExpanderService
 */
export type SkillExpansionRawOutput = {
  skillItems: SkillItem[];
};

/**
 * A skill extracted by SkillExpanderService
 */
export type SkillItem = {
  skill: string;
  reason: string;
  learningOutcome?: string;
};

/**
 * Complete test set for skill expansion evaluation
 */
export type SkillExpansionTestSet = {
  name: string;
  cases: SkillExpansionTestSetEntry[];
};

// ============================================================================
// JUDGE EVALUATION TYPES
// ============================================================================

/**
 * Input to the judge evaluator for skill expansion evaluation
 */
export type SkillExpansionJudgeInput = {
  question: string;
  systemSkills: SkillItem[];
};

/**
 * Verdict for a single skill from the judge
 *
 * Simplified format: just verdict + note
 */
export type SkillVerdict = {
  skill: string;
  verdict: 'PASS' | 'FAIL';
  note: string;
};

/**
 * Overall assessment from the judge
 *
 * Simplified format: only conceptPreserved + summary
 */
export type SkillOverallAssessment = {
  conceptPreserved: boolean;
  summary: string;
};

/**
 * Complete output from the judge evaluator
 */
export type SkillExpansionJudgeOutput = {
  skills: SkillVerdict[];
  overall: SkillOverallAssessment;
};

/**
 * Judge evaluation result including token usage
 */
export type SkillExpansionJudgeResult = {
  result: SkillExpansionJudgeOutput;
  tokenUsage: TokenUsage[];
};

// ============================================================================
// COMPARISON TYPES
// ============================================================================

/**
 * Agreement type between system and judge
 */
export type AgreementType = 'AGREE' | 'DISAGREE';

/**
 * Comparison record for a single skill
 *
 * Simplified to match new judge output format
 */
export type SkillComparisonRecord = {
  question: string;
  systemSkill: string;
  systemReason: string;
  systemLearningOutcome?: string;
  judgeVerdict: 'PASS' | 'FAIL';
  judgeNote: string;
  agreementType: AgreementType;
};

/**
 * Overall comparison for a question
 */
export type QuestionComparisonRecord = {
  question: string;
  skills: SkillComparisonRecord[];
  overall: {
    conceptPreserved: boolean;
    agreementCount: number;
    disagreementCount: number;
    totalSkills: number;
  };
};

// ============================================================================
// SAMPLE EVALUATION TYPES
// ============================================================================

/**
 * A single question sample for evaluation
 */
export type QuestionEvalSample = {
  queryLogId: string;
  question: string;
  systemSkills: SkillItem[];
};

/**
 * Result of evaluating a single question sample
 */
export type SampleEvaluationRecord = {
  queryLogId: string;
  question: string;
  comparison: QuestionComparisonRecord;
  judgeResult: SkillExpansionJudgeResult;
  evaluatedAt: string;
};

// ============================================================================
// METRICS TYPES
// ============================================================================

/**
 * Primary metrics for skill expansion evaluation
 *
 * Simplified to match new judge output format (PASS/FAIL only)
 */
export type SkillExpansionMetrics = {
  // Pass/Fail metrics
  totalSkills: number;
  passedSkills: number;
  passRate: number;

  // Concept preservation metrics
  totalQuestions: number;
  conceptPreservedQuestions: number;
  conceptPreservationRate: number;

  // Agreement metrics
  agreedSkills: number;
  totalEvaluatedSkills: number;
  overallAgreementRate: number;

  // Skill count distribution
  skillCountDistribution: Record<number, number>;

  // Confusion matrix (system always keeps, so only FP/FN possible)
  truePositives: number; // System KEEP, Judge PASS
  falsePositives: number; // System KEEP, Judge FAIL
};

/**
 * Confusion matrix for skill expansion
 */
export type SkillExpansionConfusionMatrix = {
  truePositives: number; // System KEEP, Judge PASS
  falsePositives: number; // System KEEP, Judge FAIL
  trueNegatives: number; // System DROP, Judge FAIL
  falseNegatives: number; // System DROP, Judge PASS
};

// ============================================================================
// PROGRESS TRACKING TYPES
// ============================================================================

/**
 * Single entry in the progress file
 */
export type SkillExpansionProgressEntry = {
  hash: string;
  queryLogId: string;
  question: string;
  skill: string;
  completedAt: string;
  result: {
    verdict: 'PASS' | 'FAIL';
    note: string;
  };
};

/**
 * Progress file for skill expansion evaluation
 */
export type SkillExpansionProgressFile = {
  testSetName: string;
  iterationNumber: number;
  entries: SkillExpansionProgressEntry[];
  lastUpdated: string;
  statistics: {
    totalItems: number;
    completedItems: number;
    pendingItems: number;
    completionPercentage: number;
  };
};

// ============================================================================
// CONFIG TYPES
// ============================================================================

/**
 * Configuration for skill expansion evaluation
 */
export type SkillExpansionEvaluationConfig = {
  judgeModel: string;
  judgeProvider?: string;
  iterations: number;
  outputDirectory: string;
  batchSize?: number;
  concurrency?: number;
  reset?: boolean;
};

// ============================================================================
// RESULT FILE TYPES
// ============================================================================

/**
 * Aggregated metrics across all iterations
 */
export type SkillExpansionFinalMetrics = {
  testSetName: string;
  totalIterations: number;
  totalSamples: number;
  totalSkills: number;
  metrics: SkillExpansionMetrics;
  metricsByIteration: Array<{
    iteration: number;
    metrics: SkillExpansionMetrics;
  }>;
  generatedAt: string;
};

/**
 * Cost tracking for skill expansion evaluation
 */
export type SkillExpansionCostRecord = {
  iteration: number;
  sampleCount: number;
  skillCount: number;
  totalTokens: number;
  totalCost: number;
  averageCostPerSample: number;
  averageCostPerSkill: number;
  model: string;
  provider?: string;
};

/**
 * Final cost aggregation across all iterations
 */
export type SkillExpansionFinalCost = {
  testSetName: string;
  totalIterations: number;
  totalSamples: number;
  totalSkills: number;
  totalTokens: number;
  totalCost: number;
  averageCostPerSample: number;
  averageCostPerSkill: number;
  costByIteration: SkillExpansionCostRecord[];
  generatedAt: string;
};
