// ============================================================================
// TEST SET TYPES (input format - IMPORTED FROM test-set.types.ts)
// ============================================================================

/**
 * Course Relevance Filter Evaluation Types
 *
 * Implements "Proxy-Based Evaluation using Stronger Models" (LLM-as-a-Judge)
 *
 * ============================================================================
 * ARCHITECTURAL DIFFERENCE: 2-Axis vs 1-Axis Evaluation
 * ============================================================================
 *
 * SYSTEM (2-Axis → Flattened):
 *   1. Skill Axis: Course relevance to extracted skill
 *   2. Context Axis: Course fit to user's specific situation/question
 *   3. Flattening: Both axes combined into single score (0-3)
 *
 * JUDGE (1-Axis):
 *   - Utility Axis: Direct assessment of course utility to user's interest
 *   - No skill decomposition, no context separation
 *   - Binary output: PASS (useful) or FAIL (not useful)
 *
 * ============================================================================
 * WHY THIS COMPARISON WORKS
 * ============================================================================
 *
 * The system's 2-axis approach is more sophisticated but also more complex.
 * The judge's 1-axis approach is simpler but captures "is this useful?" directly.
 *
 * By comparing:
 * - System Score (0-3): Result of skill + context analysis
 * - Judge Verdict (PASS/FAIL): Result of utility analysis
 *
 * We measure: "Does the sophisticated 2-axis analysis align with direct utility judgment?"
 *
 * ============================================================================
 * BLIND EVALUATION PROTOCOL
 * ============================================================================
 *
 * The judge does NOT see:
 * - Extracted skills
 * - System's scores (0-3)
 * - System's reasoning
 * - System's skill/context axis breakdown
 *
 * The judge ONLY sees:
 * - User's original question (interest)
 * - Course title + learning outcomes
 */

// RELEVANCE SCORE TYPES

/**
 * System's relevance score (0-3 ordinal scale)
 */
export type SystemRelevanceScore = 0 | 1 | 2 | 3;

/**
 * System's action based on score
 * - DROP: Score 0 (not relevant)
 * - KEEP: Score 1-3 (some relevance)
 */
export type SystemAction = 'DROP' | 'KEEP';

/**
 * Judge's binary verdict
 * - FAIL: Course should be excluded (equivalent to System Score 0)
 * - PASS: Course should be included (equivalent to System Score 1-3)
 */
export type JudgeVerdict = 'FAIL' | 'PASS';

/**
 * Agreement type between system and judge
 */
export type AgreementType =
  | 'BOTH_KEEP' // System 1-3 AND Judge PASS
  | 'BOTH_DROP' // System 0 AND Judge FAIL
  | 'EXPLORATORY_DELTA' // System 1-3 AND Judge FAIL (system keeps, judge drops)
  | 'CONSERVATIVE_DROP'; // System 0 AND Judge PASS (system drops, judge keeps)

// ============================================================================
// COURSE INPUT TYPES (for Judge)
// ============================================================================

/**
 * Learning outcome for judge input
 */
export type JudgeLearningOutcome = {
  id?: string;
  name: string;
};

/**
 * Course information for judge evaluation
 * Simplified structure - only what the judge needs to see
 */
export type JudgeCourseInput = {
  code: string;
  name: string;
  outcomes: string[]; // Array of LO names (plain strings)
};

/**
 * Input for binary judge evaluation
 *
 * NOTE: The judge is INTEREST-BASED, not SKILL-BASED.
 * It evaluates the course directly against the user's original interest (question).
 * No skill context is provided to the judge.
 */
export type JudgeEvaluationInput = {
  question: string; // User's original interest/question
  courses: JudgeCourseInput[];
};

// ============================================================================
// SYSTEM OUTPUT TYPES (from historical test sets)
// ============================================================================

/**
 * System's scored course (from historical test set)
 */
export type SystemCourseOutput = {
  code: string;
  name: string;
  score: SystemRelevanceScore;
  action: SystemAction;
  reason: string;
  outcomes: JudgeLearningOutcome[]; // Matched/All LOs from test set
};

// ============================================================================
// JUDGE OUTPUT TYPES
// ============================================================================

/**
 * Judge's verdict for a single course
 */
export type JudgeCourseVerdict = {
  code: string;
  verdict: JudgeVerdict;
  reason: string;
};

/**
 * Judge's complete evaluation result
 */
export type JudgeEvaluationResult = {
  courses: JudgeCourseVerdict[];
};

// ============================================================================
// EVALUATION RECORD TYPES (comparison)
// ============================================================================

/**
 * Single course comparison record
 */
export type CourseComparisonRecord = {
  // Input data
  subjectCode: string;
  subjectName: string;
  outcomes: string[];

  // Matched skills (preserved from aggregation)
  matchedSkills: MatchedSkill[];

  // System output (from test set)
  system: {
    score: SystemRelevanceScore;
    action: SystemAction;
    reason: string;
  };

  // Judge output (fresh evaluation)
  judge: {
    verdict: JudgeVerdict;
    reason: string;
  };

  // Comparison result
  agreement: boolean;
  agreementType: AgreementType;
};

/**
 * Single sample (query + courses) evaluation record
 *
 * Per-question format (deduplicated by subjectCode).
 * The judge evaluates based on `question` (user interest) + `courses` only.
 */
export type SampleEvaluationRecord = {
  queryLogId: string;
  question: string; // User's original interest (used by judge)
  courses: CourseComparisonRecord[];
};

/**
 * Complete iteration record
 */
export type IterationRecord = {
  iteration: number;
  timestamp: string;
  config: {
    systemPromptVersion: string;
    judgeModel: string;
    judgeProvider: string;
  };
  samples: SampleEvaluationRecord[];
};

// ============================================================================
// METRICS TYPES
// ============================================================================

/**
 * Score distribution for system output
 */
export type ScoreDistribution = {
  score0: number; // DROP
  score1: number; // KEEP (low)
  score2: number; // KEEP (mid)
  score3: number; // KEEP (high)
};

/**
 * Confusion matrix: Judge (rows) vs System Action (columns)
 * [
 *   [Both Drop, System Keep ∧ Judge Fail],
 *   [System Drop ∧ Judge Pass, Both Keep]
 * ]
 */
export type ConfusionMatrix = {
  label: string;
  matrix: [
    [number, number], // Judge FAIL row
    [number, number], // Judge PASS row
  ];
  totals: {
    systemDrop: number;
    systemKeep: number;
    judgeFail: number;
    judgePass: number;
  };
};

/**
 * Main metrics for evaluation
 */
export type EvaluationMetrics = {
  // Sample counts
  sampleCount: number;
  totalCoursesEvaluated: number;

  // Primary metrics
  overallAgreementRate: {
    value: number;
    numerator: number;
    denominator: number;
    description: string;
  };
  noiseRemovalEfficiency: {
    value: number;
    numerator: number;
    denominator: number;
    description: string;
  };
  exploratoryRecall: {
    value: number;
    numerator: number;
    denominator: number;
    description: string;
  };
  conservativeDropRate: {
    value: number;
    numerator: number;
    denominator: number;
    description: string;
  };

  // Distribution metrics
  systemScoreDistribution: ScoreDistribution;
  confusionMatrix: ConfusionMatrix;
};

/**
 * Metrics file output (per iteration)
 */
export type MetricsFile = EvaluationMetrics & {
  iteration: number;
  timestamp: string;
};

/**
 * Final aggregated metrics across all iterations
 */
export type FinalMetricsFile = {
  iterations: number;
  timestamp: string;
  aggregateMetrics: {
    overallAgreementRate: {
      mean: number;
      min: number;
      max: number;
      stdDev: number;
    };
    noiseRemovalEfficiency: {
      mean: number;
      min: number;
      max: number;
      stdDev: number;
    };
    exploratoryRecall: {
      mean: number;
      min: number;
      max: number;
      stdDev: number;
    };
  };
  perIterationMetrics: MetricsFile[];
};

// ============================================================================
// DISAGREEMENT ANALYSIS TYPES
// ============================================================================

/**
 * Disagreement pattern analysis
 */
export type DisagreementPattern = {
  pattern: string;
  count: number;
  description: string;
  example: {
    question: string;
    subjectCode: string;
    subjectName: string;
    systemScore: SystemRelevanceScore;
    judgeReason: string;
  };
};

/**
 * Disagreement by type
 */
export type DisagreementByType = {
  EXPLORATORY_DELTA: {
    count: number;
    percentage: number;
    description: string;
    bySystemScore: {
      score1: number;
      score2: number;
      score3: number;
    };
    commonPatterns: DisagreementPattern[];
    examples: Array<{
      queryLogId: string;
      question: string;
      subjectCode: string;
      subjectName: string;
      systemScore: SystemRelevanceScore;
      systemReason: string;
      judgeVerdict: JudgeVerdict;
      judgeReason: string;
    }>;
  };
  CONSERVATIVE_DROP: {
    count: number;
    percentage: number;
    description: string;
    commonPatterns: DisagreementPattern[];
    examples: Array<{
      queryLogId: string;
      question: string;
      subjectCode: string;
      subjectName: string;
      systemScore: SystemRelevanceScore;
      systemReason: string;
      judgeVerdict: JudgeVerdict;
      judgeReason: string;
    }>;
  };
};

/**
 * Complete disagreements analysis file
 */
export type DisagreementsFile = {
  totalDisagreements: number;
  totalSamples: number;
  disagreementRate: number;
  byType: DisagreementByType;
  insights: {
    systemCharacter: string;
    judgeCharacter: string;
    recommendation: string;
  };
};

// ============================================================================
// EXPLORATORY DELTA ANALYSIS TYPES
// ============================================================================

/**
 * Exploratory delta category
 */
export type ExploratoryDeltaCategory = {
  count: number;
  description: string;
  pattern: string;
  examples: Array<{
    queryLogId: string;
    question: string;
    subjectCode: string;
    subjectName: string;
    systemScore: SystemRelevanceScore;
    judgeReason: string;
  }>;
};

/**
 * Complete exploratory delta analysis file
 */
export type ExploratoryDeltaFile = {
  description: string;
  totalCases: number;
  categories: {
    FOUNDATIONAL_OVERKEEP: ExploratoryDeltaCategory;
    SIBLING_MISCLASSIFICATION: ExploratoryDeltaCategory;
    CONTEXTUAL_OVERALIGNMENT: ExploratoryDeltaCategory;
  };
  insights: {
    strength: string;
    weakness: string;
    recommendation: string;
  };
};

// ============================================================================
// TRANSFORMER TYPES (test set → evaluation format)
// ============================================================================

/**
 * Matched skill for a course (preserved after deduplication)
 */
export type MatchedSkill = {
  skill: string;
  score: SystemRelevanceScore;
  learningOutcomes: Array<{
    id: string;
    name: string;
  }>;
};

/**
 * Aggregated course for evaluation (after deduplication)
 *
 * Deduplication rules:
 * - Key: subjectCode (per question)
 * - Score: MAX across all skills
 * - Action: KEPT if score > 0, DROPPED if score = 0
 * - Preserves: All matchedSkills[] array
 */
export type AggregatedCourseForEval = {
  // Course identification
  subjectCode: string;
  subjectName: string;

  // System's evaluation (our domain classification)
  systemAction: SystemAction;
  systemScore: SystemRelevanceScore;

  // Optional: preserve original system reason for debugging
  systemReason?: string;

  // All matched skills (for context/debugging)
  matchedSkills: MatchedSkill[];

  // All learning outcomes (for judge evaluation)
  allLearningOutcomes: Array<{
    id: string;
    name: string;
  }>;
};

/**
 * Question evaluation sample (after transformation)
 *
 * Per-question format with deduplicated courses.
 * Each course appears once with MAX score across all skills.
 */
export type QuestionEvalSample = {
  queryLogId: string;
  question: string;
  courses: AggregatedCourseForEval[];
};

// ============================================================================
// PROGRESS TRACKING TYPES
// ============================================================================

/**
 * Course progress file entry
 */
export type CourseProgressEntry = {
  hash: string;
  queryLogId: string;
  question: string;
  subjectCode: string; // Deduplication key (not skill)
  subjectName: string;
  completedAt: string;
  judgeVerdict: JudgeVerdict;
  judgeReason: string;
};

/**
 * Course filter progress file
 *
 * Tracks course-level progress for crash recovery.
 * Hash key: SHA256(queryLogId + question + subjectCode)
 */
export type CourseFilterProgressFile = {
  testSetName: string;
  iterationNumber: number;
  entries: CourseProgressEntry[];
  lastUpdated: string;
  statistics: {
    totalCourses: number;
    completedCourses: number;
    pendingCourses: number;
    completionPercentage: number;
  };
};

// ============================================================================
// CONFIG TYPES
// ============================================================================

/**
 * Evaluation run configuration
 */
export type EvaluationConfig = {
  systemPromptVersion: string;
  judgeModel: string;
  judgeProvider: string;
  iterations?: number;
  outputDirectory: string;
};

/**
 * Config file (saved with evaluation results)
 */
export type ConfigFile = {
  systemPromptVersion: string;
  judgeModel: string;
  judgeProvider: string;
  evaluationDate: string;
  testSetFile: string;
  testSetVersion: string;
};
