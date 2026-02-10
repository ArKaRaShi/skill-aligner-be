import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import type { AggregatedCourseSkills } from 'src/modules/query-processor/types/course-aggregation.type';

// ============================================================================
// ANSWER SYNTHESIS EVALUATION TYPES
// ============================================================================
// Implements "LLM-as-a-Judge" evaluation for answer synthesis quality.
// The judge evaluates system-generated answers based on FAITHFULNESS:
// - Does the answer faithfully represent the provided context?
// - No hallucinations or outside knowledge used?
// ============================================================================

// ============================================================================
// TEST CASE TYPES (input format - enriched with context)
// ============================================================================

/**
 * Test case for answer synthesis evaluation
 *
 * Enriched with course context from the aggregation step.
 * The judge needs to see:
 * 1. User's question
 * 2. Course context (ranked courses with matched skills/LOs)
 * 3. System's generated answer
 */
export type AnswerSynthesisTestCase = {
  queryLogId: string;
  question: string;
  answer: string;
  context: AggregatedCourseSkills[]; // Ranked courses from aggregation step
  llmModel?: string;
  llmProvider?: string;
  promptVersion?: string;
  duration: number | null;
  tokenUsage?: TokenUsage;
};

// ============================================================================
// JUDGE EVALUATION TYPES
// ============================================================================

/**
 * Score for judge evaluation (1-5 ordinal scale)
 */
export type Score1to5 = 1 | 2 | 3 | 4 | 5;

/**
 * Score dimension with reasoning (used for both faithfulness and completeness)
 */
export type ScoreDimension = {
  score: Score1to5;
  reasoning: string;
};

/**
 * Faithfulness dimension with reasoning
 */
export type FaithfulnessDimension = ScoreDimension;

/**
 * Completeness dimension with reasoning
 */
export type CompletenessDimension = ScoreDimension;

/**
 * Judge's verdict for answer synthesis evaluation
 *
 * Evaluates TWO dimensions:
 * 1. FAITHFULNESS: Does the answer stick to the provided context?
 *    - 1: Completely False (hallucinations, contradicts context)
 *    - 2: Mostly False (major factual errors)
 *    - 3: Mixed (mix of supported and unsupported claims)
 *    - 4: Mostly True (minor misses, no false claims)
 *    - 5: Perfect (fully supported, zero hallucinations)
 *
 * 2. COMPLETENESS: Does the answer explain WHY courses matter to the user?
 *    - 1: Fail (just lists codes, or says none found when valid options exist)
 *    - 2: Weak (very little context or explanation)
 *    - 3: Descriptive Only (lists facts, doesn't explain value)
 *    - 4: Good Explanation (logical links, slightly generic)
 *    - 5: Excellent Bridging (explicitly connects courses to user's goal)
 */
export type AnswerSynthesisJudgeVerdict = {
  /** How faithfully does the answer adhere to the provided context? */
  faithfulness: FaithfulnessDimension;
  /** How well does the answer explain WHY courses matter to the user? */
  completeness: CompletenessDimension;
};

/**
 * Judge's complete evaluation result
 */
export type AnswerSynthesisJudgeResult = {
  verdict: AnswerSynthesisJudgeVerdict;
  tokenUsage: TokenUsage[];
};

// ============================================================================
// COMPARISON RECORD TYPES (system vs judge)
// ============================================================================

/**
 * Single comparison record for answer synthesis
 *
 * Compares system's answer with judge's verdict.
 * Overall score is the average of faithfulness and completeness (1-5).
 * Pass requires BOTH dimensions ≥ 4.
 */
export type AnswerSynthesisComparisonRecord = {
  queryLogId: string;
  question: string;
  systemAnswer: string;
  judgeVerdict: AnswerSynthesisJudgeVerdict;
  /** Average of faithfulness and completeness scores (1-5) */
  overallScore: number;
  /** Pass if BOTH faithfulness ≥ 4 AND completeness ≥ 4 */
  passed: boolean;
  /** Course count (for context size analysis) */
  courseCount: number;
  /** Token usage from judge evaluation */
  tokenUsage: TokenUsage[];
};

/**
 * Single sample evaluation record (per question)
 *
 * One record per question (unlike course filter which has per-course records).
 */
export type AnswerSynthesisSampleRecord = {
  sampleId: number;
  queryLogId: string;
  question: string;
  systemAnswer: string;
  judgeVerdict: AnswerSynthesisJudgeVerdict;
  overallScore: number;
  passed: boolean;
  courseCount: number;
  tokenUsage: TokenUsage[];
};

/**
 * Complete iteration record
 */
export type AnswerSynthesisIterationRecord = {
  iteration: number;
  timestamp: string;
  config: {
    systemPromptVersion?: string;
    judgeModel: string;
    judgeProvider: string;
  };
  samples: AnswerSynthesisSampleRecord[];
};

// ============================================================================
// METRICS TYPES
// ============================================================================

/**
 * Score distribution for 1-5 faithfulness scale
 */
export type Score1to5Distribution = {
  score1: number;
  score2: number;
  score3: number;
  score4: number;
  score5: number;
};

/**
 * Fraction metric with numerator/denominator
 */
export type FractionMetric = {
  value: number;
  numerator: number;
  denominator: number;
  description: string;
};

/**
 * Main metrics for answer synthesis evaluation
 */
export type AnswerSynthesisMetrics = {
  // Sample counts
  sampleCount: number;

  // FAITHFULNESS metrics (1-5 scale)
  averageFaithfulnessScore: FractionMetric;
  faithfulnessPassRate: FractionMetric;
  faithfulnessDistribution: Score1to5Distribution;

  // COMPLETENESS metrics (1-5 scale)
  averageCompletenessScore: FractionMetric;
  completenessPassRate: FractionMetric;
  completenessDistribution: Score1to5Distribution;

  // Overall pass rate (BOTH dimensions ≥ 4)
  overallPassRate: FractionMetric;

  // Context size analysis
  averageCourseCount: FractionMetric;
};

/**
 * Metrics file output (per iteration)
 */
export type AnswerSynthesisMetricsFile = AnswerSynthesisMetrics & {
  iteration: number;
  timestamp: string;
};

/**
 * Final aggregated metrics across all iterations
 */
export type AnswerSynthesisFinalMetricsFile = {
  iterations: number;
  timestamp: string;
  aggregateMetrics: {
    averageFaithfulnessScore: {
      mean: number;
      min: number;
      max: number;
      stdDev: number;
    };
    averageCompletenessScore: {
      mean: number;
      min: number;
      max: number;
      stdDev: number;
    };
    faithfulnessPassRate: {
      mean: number;
      min: number;
      max: number;
      stdDev: number;
    };
    completenessPassRate: {
      mean: number;
      min: number;
      max: number;
      stdDev: number;
    };
    overallPassRate: {
      mean: number;
      min: number;
      max: number;
      stdDev: number;
    };
  };
  perIterationMetrics: AnswerSynthesisMetricsFile[];
};

// ============================================================================
// LOW-QUALITY ANALYSIS TYPES
// ============================================================================

/**
 * Low-quality category (failed evaluations)
 * Used for both faithfulness and completeness failures
 */
export type LowQualityCategory = {
  count: number;
  percentage: number;
  description: string;
  examples: Array<{
    queryLogId: string;
    question: string;
    overallScore: number;
    judgeReasoning: string;
  }>;
};

/**
 * Complete low-quality analysis file
 *
 * Analyzes patterns in low-quality answers to identify improvement areas.
 * Covers BOTH faithfulness failures (hallucinations) AND completeness failures (poor explanation).
 */
export type AnswerSynthesisLowFaithfulnessFile = {
  totalLowQuality: number;
  totalSamples: number;
  lowQualityRate: number;

  // Faithfulness failures (score < 4)
  byFaithfulnessReason: {
    completelyFalse: LowQualityCategory; // Score 1
    mostlyFalse: LowQualityCategory; // Score 2
    mixed: LowQualityCategory; // Score 3
  };

  // Completeness failures (score < 4)
  byCompletenessReason: {
    fail: LowQualityCategory; // Score 1
    weak: LowQualityCategory; // Score 2
    descriptiveOnly: LowQualityCategory; // Score 3
  };

  insights: {
    systemStrength: string;
    systemWeakness: string;
    recommendation: string;
  };
};

// ============================================================================
// PROGRESS TRACKING TYPES
// ============================================================================

/**
 * Progress entry for answer synthesis evaluation
 *
 * Hash key: SHA256(queryLogId)
 * One entry per question (not per course like course filter).
 */
export type AnswerSynthesisProgressEntry = {
  hash: string;
  queryLogId: string;
  question: string;
  completedAt: string;
  result: {
    faithfulnessScore: number; // 1-5
    completenessScore: number; // 1-5
    passed: boolean; // BOTH scores ≥ 4
  };
};

/**
 * Progress file for answer synthesis evaluation
 *
 * Tracks question-level progress for crash recovery.
 */
export type AnswerSynthesisProgressFile = {
  testSetName: string;
  iterationNumber: number;
  entries: AnswerSynthesisProgressEntry[];
  lastUpdated: string;
  statistics: {
    totalQuestions: number;
    completedQuestions: number;
    pendingQuestions: number;
    completionPercentage: number;
  };
};

// ============================================================================
// CONFIG TYPES
// ============================================================================

/**
 * Evaluation run configuration
 */
export type AnswerSynthesisEvaluationConfig = {
  systemPromptVersion?: string;
  judgeModel: string;
  judgeProvider: string;
  iterations?: number;
  outputDirectory: string;
};

/**
 * Config file (saved with evaluation results)
 */
export type AnswerSynthesisConfigFile = {
  systemPromptVersion?: string;
  judgeModel: string;
  judgeProvider: string;
  evaluationDate: string;
  testSetFile: string;
  contextSetFile: string; // Separate file for course context
  testSetVersion: string;
};

// ============================================================================
// COST TRACKING TYPES
// ============================================================================

/**
 * Cost file for a single iteration
 */
export type AnswerSynthesisCostFile = {
  iteration: number;
  timestamp: string;
  testSetName: string;
  judgeModel: string;
  judgeProvider: string;
  samples: number;
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };
  totalCost: number;
  tokenUsage: TokenUsage[];
};

/**
 * Final aggregated cost file across all iterations
 */
export type AnswerSynthesisFinalCostFile = {
  iterations: number;
  timestamp: string;
  testSetName: string;
  judgeModel: string;
  judgeProvider: string;
  aggregateStats: {
    totalSamples: number;
    totalTokens: {
      input: number;
      output: number;
      total: number;
    };
    totalCost: number;
    averageCostPerSample: number;
  };
  perIterationCosts: AnswerSynthesisCostFile[];
};

// ============================================================================
// LOADER TYPES
// ============================================================================

/**
 * Test set format loaded from JSON file
 * (from TestSetBuilderService.buildAnswerSynthesisTestSet)
 */
export type AnswerSynthesisTestSet = {
  queryLogId: string;
  question: string;
  answer: string;
  llmModel?: string;
  llmProvider?: string;
  promptVersion?: string;
  duration: number | null;
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
};

/**
 * Context set format loaded from JSON file
 * (from TestSetBuilderService.buildCourseAggregationTestSet)
 *
 * Contains ranked courses with matched skills for context.
 */
export type AnswerSynthesisContextSet = {
  queryLogId: string;
  question: string;
  filteredSkillCoursesMap: Record<
    string,
    Array<{
      subjectCode: string;
      subjectName: string;
      maxRelevanceScore: number;
      matchedSkills: Array<{
        skill: string;
        score: number;
        learningOutcomes: Array<{ id: string; name: string }>;
      }>;
      courseLearningOutcomes: Array<{ id: string; name: string }>;
    }>
  >;
  rankedCourses: AggregatedCourseSkills[];
  duration: number | null;
};
