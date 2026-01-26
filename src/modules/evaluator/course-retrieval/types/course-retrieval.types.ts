import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';
import { TokenCostEstimateSummary } from 'src/shared/utils/token-cost-calculator.helper';

// ============================================================================
// COURSE INFO TYPES
// ============================================================================

/**
 * Course information for evaluation
 */
export type CourseInfo = {
  subjectCode: string;
  subjectName: string;
  cleanedLearningOutcomes: string[];
};

/**
 * Course information formatted for LLM consumption
 */
export type LlmCouresInfo = {
  course_code: string;
  course_name: string;
  learning_outcomes: string[];
};

// ============================================================================
// TEST SET TYPES (merged from test-sets/test-set.type.ts)
// ============================================================================

/**
 * Single test case for course retrieval evaluation
 *
 * Represents a complete scenario including the question, extracted skill,
 * retrieved courses, and optional expected metrics for validation.
 */
export type CourseRetrieverTestCase = {
  /** Unique identifier for this test case (e.g., 'v1-001', 'v2-015') */
  id: string;
  /** The user's question */
  question: string;
  /** The extracted skill from the question */
  skill: string;
  /** Courses retrieved from the search/lookup system */
  retrievedCourses: CourseInfo[];
  /** Optional expected metrics for validation */
  expectedMetrics?: {
    /** Minimum acceptable average skill relevance (0-3) */
    minAverageSkillRelevance?: number;
    /** Maximum acceptable context mismatch rate (0-100%) */
    maxContextMismatchRate?: number;
  };
};

/**
 * A versioned collection of test cases
 *
 * Test sets allow tracking test evolution while maintaining
 * backward compatibility - old test sets can always be re-run.
 */
export type CourseRetrieverTestSet = {
  /** Version number (1, 2, 3, etc.) */
  version: number;
  /** Test set identifier (e.g., 'test-set-v1', 'test-set-v2') */
  name: string;
  /** Human-readable description of this test set */
  description: string;
  /** All test cases in this set */
  cases: CourseRetrieverTestCase[];
  /** Deduplication statistics (after transformation) */
  deduplicationInfo?: CourseRetrievalDedupeInfo;
};

/**
 * Deduplication information for a test set
 *
 * Tracks how many duplicate (skill, courses) pairs were removed
 * during transformation to enable cost-effective evaluation.
 */
export type CourseRetrievalDedupeInfo = {
  /** Total number of test cases before deduplication */
  totalCases: number;
  /** Number of unique (skill, courses) groups after deduplication */
  uniqueGroups: number;
  /** Number of duplicate test cases removed */
  duplicateCount: number;
  /** Percentage of duplicates removed (0-100) */
  deduplicationRate: number;
};

/**
 * Template literal type for test set identifiers
 *
 * Ensures type safety when referencing test sets by name.
 */
export type TestSetIdentifier = `test-set-v${number}`;

// ============================================================================
// DEDUPLICATION TYPES (for Cross-Question Skill Deduplication)
// ============================================================================

/**
 * Deduplication key for grouping identical (skill, courses) pairs
 *
 * Format: "{skill}-{coursesHash}"
 * Used to identify when multiple questions retrieve the same courses for the same skill.
 */
export type CourseRetrievalDedupeKey = string;

/**
 * Hash parameters for generating deduplication keys
 *
 * Unlike CourseRetrievalHashParams which includes question for record tracking,
 * this only includes skill and courses for evaluation deduplication.
 */
export type CourseRetrievalDedupeHashParams = {
  /** The skill being evaluated */
  skill: string;
  /** Courses retrieved for this skill */
  courses: CourseInfo[];
};

/**
 * A deduplication group of test cases
 *
 * Multiple test cases (questions) that share the same (skill, courses) pair.
 * These should be evaluated once, with results applied to all test cases.
 */
export type CourseRetrievalDedupeGroup = {
  /** Unique identifier for this group */
  dedupeKey: CourseRetrievalDedupeKey;
  /** The skill being evaluated */
  skill: string;
  /** Courses retrieved for this skill (same for all test cases in group) */
  courses: CourseInfo[];
  /** Hash of the courses array for identification */
  coursesHash: string;
  /** All test cases that belong to this deduplication group */
  testCases: CourseRetrieverTestCase[];
};

/**
 * Input for running a complete test set
 */
export type RunTestSetInput = {
  /** The test set to run */
  testSet: CourseRetrieverTestSet;
  /** Current iteration number (for multi-run experiments) */
  iterationNumber: number;
  /** Judge model to use (optional, defaults to EvaluatorJudgeConfig) */
  judgeModel?: string;
  /** Judge provider to use (optional, defaults to EvaluatorJudgeConfig) */
  judgeProvider?: string;
};

// ============================================================================
// NOTE: Legacy three-level aggregation types removed
//
// The following types were removed as part of the single-score migration:
// - IterationMetrics, AggregateMetrics, FinalMetrics
// - ContextMismatchEntry, SkillMetrics, AveragedMetrics
// - TestCaseMetrics, EnhancedIterationMetrics
//
// These were built around the two-dimensional evaluation model
// (skillRelevance + contextAlignment) and are no longer needed
// with the simplified single relevance score model.
// ============================================================================

// ============================================================================
// EVALUATOR TYPES
// ============================================================================

/**
 * Input for course retriever evaluator
 */
export type CourseRetrieverEvaluatorInput = {
  question: string;
  skill: string;
  retrievedCourses: CourseInfo[];
};

/**
 * Relevance score (0-3)
 */
type RelevanceScore = 0 | 1 | 2 | 3;

/**
 * Single course evaluation item (simplified to single-score model)
 *
 * Uses the updated evaluation model (commit e9cfa11) with a single
 * relevance score instead of the two-dimensional skill+context model.
 */
export type EvaluationItem = {
  subjectCode: string;
  subjectName: string;
  relevanceScore: RelevanceScore;
  reason: string;
};

/**
 * Score distribution for relevance metrics
 */
export type RetrievalScoreDistribution = {
  relevanceScore: RelevanceScore;
  percentage: number;
  count: number;
};

/**
 * Per-class macro and micro rate for a specific relevance score
 *
 * Provides both aggregation methods for transparency:
 * - **Macro-average**: Average of sample rates (each sample weighted equally)
 * - **Micro-average**: Total count / total items (weighted by sample size)
 */
export type PerClassRate = {
  /** The relevance score this rate represents */
  relevanceScore: RelevanceScore;
  /** Count of courses with this score */
  count: number;
  /** Macro-average: average of sample rates for this score (0-100) */
  macroAverageRate: number;
  /** Micro-average: total count with this score / total courses * 100 (0-100) */
  microAverageRate: number;
  /** Label for human readability */
  label:
    | 'irrelevant'
    | 'slightly_relevant'
    | 'fairly_relevant'
    | 'highly_relevant';
};

/**
 * Complete per-class distribution with both macro and micro averages
 *
 * Shows macro vs micro for each score class, revealing:
 * - Which score classes have consistent rates across samples (macro ≈ micro)
 * - Which score classes vary by sample size (macro ≠ micro)
 * - Where the overall macro/micro difference comes from
 */
export type PerClassDistribution = {
  /** Score 0: Irrelevant courses */
  score0: PerClassRate;
  /** Score 1: Slightly relevant courses */
  score1: PerClassRate;
  /** Score 2: Fairly relevant courses */
  score2: PerClassRate;
  /** Score 3: Highly relevant courses */
  score3: PerClassRate;
};

// ============================================================================
// PROXY METRIC TYPES (NDCG and Precision)
// ============================================================================

/**
 * NDCG (Normalized Discounted Cumulative Gain) metrics
 *
 * Provides two perspectives on ranking quality:
 * - **Proxy NDCG**: Uses actual scores sorted as ideal (ranking quality of retrieved items)
 * - **Ideal NDCG**: Uses all perfect scores (3,3,3...) as ideal (quality vs perfect ground truth)
 *
 * **Proxy NDCG**: Measures how well we ranked what we found
 * - IDCG = DCG of actual scores sorted descending
 * - Interpretation: "Perfect ranking" means best possible ordering of retrieved items
 * - Use case: Isolate ranking quality from retrieval quality
 *
 * **Ideal NDCG**: Measures how close we are to perfect results
 * - IDCG = DCG of all perfect scores (3, 3, 3, ...)
 * - Interpretation: "Perfect" means all retrieved items are highly relevant (score 3)
 * - Use case: End-to-end system quality evaluation
 *
 * See /docs/ndcg-metrics-approach.md for detailed explanation.
 */
export interface NdcgMetrics {
  /**
   * Proxy NDCG: Ranking quality of retrieved items
   *
   * IDCG is calculated from actual scores sorted descending.
   * Measures: "How well did we rank the courses we retrieved?"
   *
   * NDCG = 1.0 means "perfectly ranked what we found"
   */
  proxy: {
    /** Proxy NDCG@5: ranking quality of top 5 results */
    at5: number;
    /** Proxy NDCG@10: ranking quality of top 10 results */
    at10: number;
    /** Proxy NDCG@15: ranking quality of top 15 results */
    at15: number;
    /** Proxy NDCG@all: ranking quality of all results */
    atAll: number;
  };
  /**
   * Ideal NDCG: Quality vs perfect ground truth
   *
   * IDCG is calculated from all perfect scores (3, 3, 3, ...).
   * Measures: "How close are we to perfect results?"
   *
   * NDCG = 1.0 means "all retrieved items are perfect (score 3) and perfectly ranked"
   */
  ideal: {
    /** Ideal NDCG@5: quality vs perfect (all 3s) at top 5 */
    at5: number;
    /** Ideal NDCG@10: quality vs perfect (all 3s) at top 10 */
    at10: number;
    /** Ideal NDCG@15: quality vs perfect (all 3s) at top 15 */
    at15: number;
    /** Ideal NDCG@all: quality vs perfect (all 3s) across all results */
    atAll: number;
  };
}

// ============================================================================
// MULTI-THRESHOLD PRECISION TYPES
// ============================================================================

/**
 * Multi-threshold precision value at a single cut-off position
 *
 * Provides precision at three relevance thresholds:
 * - threshold1: Score ≥ 1 (slightly, fairly, or highly relevant) - LENIENT
 * - threshold2: Score ≥ 2 (fairly or highly relevant) - STANDARD
 * - threshold3: Score ≥ 3 (highly relevant only) - STRICT
 *
 * Invariant: threshold1 ≥ threshold2 ≥ threshold3
 * (lenient measure ≥ standard measure ≥ strict measure)
 */
export interface MultiThresholdPrecisionValue {
  /** Threshold ≥1: At least "slightly relevant" (lenient measure) */
  threshold1: number;
  /** Threshold ≥2: "Fairly or highly relevant" (standard metric) */
  threshold2: number;
  /** Threshold ≥3: "Highly relevant" only (strict measure) */
  threshold3: number;
}

/**
 * Multi-threshold precision metric
 *
 * Replaces the single-threshold PrecisionMetric with multi-threshold values
 * at each cut-off position (5, 10, 15, all).
 *
 * Provides nuanced view of retrieval quality:
 * - threshold1: How much noise is in results? (low = lots of score 0)
 * - threshold2: Standard quality baseline
 * - threshold3: How many are excellent matches? (high = mostly score 3)
 */
export interface MultiThresholdPrecision {
  at5: MultiThresholdPrecisionValue;
  at10: MultiThresholdPrecisionValue;
  at15: MultiThresholdPrecisionValue;
  atAll: MultiThresholdPrecisionValue;
}

/**
 * @deprecated Use MultiThresholdPrecision instead
 *
 * Old single-threshold precision metric (legacy format for migration)
 * Only stores threshold 2 (score ≥ 2) as the standard metric.
 */
export interface LegacyPrecisionMetric {
  /** Precision@5: % of top 5 with score ≥ 2 */
  at5: number;
  /** Precision@10: % of top 10 with score ≥ 2 */
  at10: number;
  /** Precision@15: % of top 15 with score ≥ 2 */
  at15: number;
  /** Precision@all: % of all results with score ≥ 2 */
  atAll: number;
}

/**
 * Precision@K metrics (multi-threshold)
 *
 * **Multi-Threshold Precision**: Provides precision at three relevance levels:
 * - Threshold 1 (lenient): Score ≥ 1 - "At least slightly relevant"
 * - Threshold 2 (standard): Score ≥ 2 - "Fairly or highly relevant" ← PRIMARY METRIC
 * - Threshold 3 (strict): Score ≥ 3 - "Highly relevant only"
 *
 * **Proxy Metric Notice**: These metrics use LLM judge scores as relevance.
 * Without ground truth, we cannot calculate true Recall or F1.
 *
 * Precision@K measures: "Of the top K results, how many are relevant?"
 *
 * Values range from 0-1, where 1 = all top K courses are relevant at that threshold.
 */
export type PrecisionMetrics = MultiThresholdPrecision;

/**
 * Retrieval performance metrics (clean, unified structure)
 *
 * Follows the modern evaluator pattern with simple aggregated metrics.
 *
 * **Proxy Metrics**: NDCG and Precision use LLM judge scores as relevance.
 * See NdcgMetrics and PrecisionMetrics for detailed notices.
 *
 * **Macro vs Micro Averages**:
 * - **Macro-average**: Average of sample rates (each sample/question weighted equally)
 * - **Micro-average**: Total count / total courses (each course weighted equally)
 *
 * Use macro when each question should have equal influence.
 * Use micro when overall course quality matters more.
 */
export type RetrievalPerformanceMetrics = {
  /** Total number of courses evaluated across all samples */
  totalCourses: number;
  /** Mean relevance score across all courses (0-3 scale) */
  meanRelevanceScore: number;
  /**
   * Per-class distribution with macro and micro averages
   *
   * Contains complete breakdown for each relevance score (0-3):
   * - Score 0: Irrelevant (no match)
   * - Score 1: Slightly relevant (weak connection)
   * - Score 2: Fairly relevant (moderate connection)
   * - Score 3: Highly relevant (strong match)
   *
   * Each score class shows:
   * - count: total number of courses with this score
   * - macroAverageRate: average of per-sample rates for this score
   * - microAverageRate: (count / totalCourses) * 100
   */
  perClassDistribution: PerClassDistribution;
  /** NDCG metrics (ranking quality, proxy metric) */
  ndcg: NdcgMetrics;
  /** Precision@K metrics (proxy metric, score ≥ 2 = relevant) */
  precision: PrecisionMetrics;
};

/**
 * Output from course retriever evaluator
 */
export type CourseRetrieverEvaluatorOutput = {
  question: string;
  skill: string;
  evaluations: EvaluationItem[];
  metrics: RetrievalPerformanceMetrics;

  llmInfo: LlmInfo;
  llmTokenUsage: TokenUsage;
  llmCostEstimateSummary: TokenCostEstimateSummary;
};

// Re-export RelevanceScore for use in schemas
export type { RelevanceScore };

/**
 * Input for course retriever evaluation (used by runner)
 */
export type EvaluateRetrieverInput = {
  /** Optional test case ID for grouping multiple skill evaluations */
  testCaseId?: string;
  question: string;
  skill: string;
  retrievedCourses: CourseInfo[];
};

/**
 * Output from course retriever evaluation (used by runner)
 */
export type EvaluateRetrieverOutput = {
  /** Optional test case ID for grouping multiple skill evaluations */
  testCaseId?: string;
  question: string;
  skill: string;
  retrievedCount: number;
  evaluations: {
    subjectCode: string;
    subjectName: string;
    relevanceScore: number;
    reason: string;
  }[];
  metrics: RetrievalPerformanceMetrics;
  llmModel: string;
  llmProvider: string;
  inputTokens: number;
  outputTokens: number;
};

// ============================================================================
// COMPARISON SERVICE TYPES (for Phase 2)
// ============================================================================

/**
 * System sample from test set
 *
 * Represents the system's retrieval results for a question+skill pair.
 */
export type CourseRetrievalSystemSample = {
  /** The user's question */
  question: string;
  /** The skill being searched for */
  skill: string;
  /** Test case ID for grouping */
  testCaseId?: string;
  /** Courses retrieved by the system */
  retrievedCourses: CourseInfo[];
};

/**
 * Judge evaluation result from LLM
 *
 * Represents the judge's verdict on the system's retrieval results.
 */
export type CourseRetrievalJudgeResult = {
  /** Individual course verdicts */
  courses: Array<{
    subjectCode: string;
    /** Verdict: how relevant is this course to the skill? */
    verdict: 'RELEVANT' | 'NOT_RELEVANT' | 'PARTIALLY_RELEVANT';
    /** Reason for the verdict */
    reason: string;
  }>;
  /** Token usage from LLM call */
  tokenUsage: TokenUsage[];
};

/**
 * Agreement type between system and judge
 *
 * Categorizes the relationship between system score and judge verdict.
 * Uses single-score relevance model (commit e9cfa11).
 */
export type CourseRetrievalAgreementType =
  | 'BOTH_RELEVANT' /** System high score (≥2) + Judge RELEVANT */
  | 'BOTH_NOT_RELEVANT' /** System low score (<2) + Judge NOT_RELEVANT */
  | 'SYSTEM_EXPLORATORY' /** System high score (≥2) + Judge NOT_RELEVANT (system too exploratory) */
  | 'SYSTEM_CONSERVATIVE' /** System low score (<2) + Judge RELEVANT (system too conservative) */
  | 'PARTIAL_MISMATCH'; /** Partial relevance disagreement */

/**
 * Comparison record for a single course
 *
 * Compares system's evaluation with judge's verdict.
 */
export type CourseRetrievalComparisonRecord = {
  /** The original question */
  question: string;
  /** The skill being evaluated */
  skill: string;
  /** Course subject code */
  subjectCode: string;
  /** Course subject name */
  subjectName: string;
  /** System's evaluation (single relevance score) */
  system: {
    /** Relevance score (0-3) */
    relevanceScore: number;
  };
  /** Judge's verdict */
  judge: {
    /** Relevance verdict */
    verdict: 'RELEVANT' | 'NOT_RELEVANT' | 'PARTIALLY_RELEVANT';
    /** Reason for verdict */
    reason: string;
  };
  /** Whether system and judge agree */
  agreement: boolean;
  /** Type of agreement/disagreement */
  agreementType: CourseRetrievalAgreementType;
};

/**
 * Sample comparison record
 *
 * Contains comparison records for all courses in a single sample.
 */
export type CourseRetrievalSampleComparisonRecord = {
  question: string;
  skill: string;
  testCaseId?: string;
  /** Individual course comparisons */
  courses: CourseRetrievalComparisonRecord[];
  /** Token usage from LLM calls */
  tokenUsage: TokenUsage[];
};

// ============================================================================
// PROGRESS TRACKING TYPES (for Phase 3)
// ============================================================================

/**
 * Hash parameters for generating unique identifiers
 *
 * Used for progress tracking and crash recovery.
 */
export type CourseRetrievalHashParams = {
  /** The user's question */
  question: string;
  /** The skill being evaluated */
  skill: string;
  /** Unique test case identifier */
  testCaseId?: string;
};

/**
 * Progress file entry for a completed evaluation
 *
 * Tracks completed evaluations for crash recovery.
 * Updated to support deduplication: each entry represents a unique (skill, courses) group.
 */
export type CourseRetrievalProgressEntry = {
  /** SHA256 hash for deduplication (hash of skill + courses) */
  hash: string;
  /** Deduplication key (skill + coursesHash) */
  dedupeKey: CourseRetrievalDedupeKey;
  /** The skill being evaluated */
  skill: string;
  /** IDs of all test cases in this deduplication group */
  testCases: string[];
  /** ISO timestamp when completed */
  completedAt: string;
  /** Evaluation result for progress tracking (simplified metrics) */
  result: {
    /** Number of courses retrieved */
    retrievedCount: number;
    /** Mean relevance score */
    meanRelevanceScore: number;
  };
};

/**
 * Progress file for crash recovery
 *
 * Tracks evaluation progress across multiple samples.
 * Updated to support deduplication: tracks unique (skill, courses) groups.
 */
export type CourseRetrievalProgressFile = {
  /** Test set name */
  testSetName: string;
  /** Iteration number */
  iterationNumber: number;
  /** Completed entries (one per unique deduplication group) */
  entries: CourseRetrievalProgressEntry[];
  /** Last update timestamp */
  lastUpdated: string;
  /** Statistics */
  statistics: {
    /** Total items to evaluate (unique groups) */
    totalItems: number;
    /** Completed items (unique groups) */
    completedItems: number;
    /** Pending items (unique groups) */
    pendingItems: number;
    /** Completion percentage */
    completionPercentage: number;
  };
  /** Deduplication statistics for this iteration */
  deduplicationStats?: {
    /** Total test cases before deduplication */
    totalTestCases: number;
    /** Unique (skill, courses) groups after deduplication */
    uniqueGroups: number;
    /** Number of duplicate test cases removed */
    duplicateCount: number;
    /** Percentage of duplicates removed */
    deduplicationRate: number;
  };
};

// ============================================================================
// FINAL METRICS TYPES (for Multi-Iteration Aggregation)
// ============================================================================

/**
 * Statistical aggregation (mean, min, max, stdDev)
 *
 * Provides confidence intervals: "0.78 ± 0.05" for presentations.
 */
export interface StatisticalMetric {
  /** Mean value across all iterations */
  mean: number;
  /** Minimum value across all iterations */
  min: number;
  /** Maximum value across all iterations */
  max: number;
  /** Standard deviation across all iterations */
  stdDev: number;
}

/**
 * NDCG metrics with statistics
 */
export interface NdcgAggregateMetrics {
  at5: StatisticalMetric;
  at10: StatisticalMetric;
  at15: StatisticalMetric;
  atAll: StatisticalMetric;
}

/**
 * Precision metrics with statistics
 */
export interface PrecisionAggregateMetrics {
  at5: StatisticalMetric;
  at10: StatisticalMetric;
  at15: StatisticalMetric;
  atAll: StatisticalMetric;
}

/**
 * Course Retrieval Final Metrics (aggregated across iterations)
 *
 * Contains aggregated statistics (mean, min, max, stdDev) across
 * multiple iterations, plus per-iteration breakdown for trend analysis.
 *
 * **Output Location**: `final-metrics/final-metrics-{N}.json`
 * **Required by**: evaluation-module-standard.md
 */
export interface CourseRetrievalFinalMetricsFile {
  /** Total number of iterations aggregated */
  iterations: number;
  /** ISO timestamp when final metrics were calculated */
  timestamp: string;
  /** Aggregated statistics across all iterations */
  aggregateMetrics: {
    // NDCG metrics (ranking quality)
    ndcgAt5: StatisticalMetric;
    ndcgAt10: StatisticalMetric;
    ndcgAt15: StatisticalMetric;
    ndcgAtAll: StatisticalMetric;

    // Precision metrics (% relevant in top K) - multi-threshold
    precisionAt5: {
      threshold1: StatisticalMetric; // ≥1: Lenient
      threshold2: StatisticalMetric; // ≥2: Standard
      threshold3: StatisticalMetric; // ≥3: Strict
    };
    precisionAt10: {
      threshold1: StatisticalMetric;
      threshold2: StatisticalMetric;
      threshold3: StatisticalMetric;
    };
    precisionAt15: {
      threshold1: StatisticalMetric;
      threshold2: StatisticalMetric;
      threshold3: StatisticalMetric;
    };
    precisionAtAll: {
      threshold1: StatisticalMetric;
      threshold2: StatisticalMetric;
      threshold3: StatisticalMetric;
    };

    // Existing basic metrics
    totalCoursesEvaluated: StatisticalMetric;
    averageRelevance: StatisticalMetric;
    highlyRelevantRate: StatisticalMetric;
    irrelevantRate: StatisticalMetric;
  };
  /** Per-iteration breakdown for trend analysis */
  perIterationMetrics: CourseRetrievalIterationMetrics[];
}

// ============================================================================
// ENRICHED METRIC TYPES (With Context and Descriptions)
// ============================================================================

/**
 * NDCG metric with full context (proxy and ideal)
 *
 * Provides both proxy and ideal NDCG perspectives for complete evaluation.
 */
export interface NdcgMetricWithContext {
  /**
   * Proxy NDCG: Mean proxy NDCG across all samples (0-1, higher = better)
   *
   * Measures: "How well did we rank the courses we retrieved?"
   */
  proxyNdcg: number;
  /**
   * Ideal NDCG: Mean ideal NDCG across all samples (0-1, higher = better)
   *
   * Measures: "How close are we to perfect results (all 3s)?"
   */
  idealNdcg: number;
  /** Human-readable explanation of what these metrics mean */
  description: string;
}

/**
 * Single threshold value with context (for display/reporting)
 *
 * Provides context for a single precision threshold value including:
 * - The mean precision value
 * - The relevant count and total count
 * - A human-readable description
 */
export interface PrecisionThresholdWithContext {
  /** Mean precision across all samples (0-1, higher = more precise) */
  meanPrecision: number;
  /** Number of relevant items in top-K (at this threshold) */
  relevantCount: number;
  /** Total items in top-K */
  totalCount: number;
  /** Human-readable explanation */
  description: string;
}

/**
 * Multi-threshold precision with context (for display/reporting)
 *
 * Provides enriched context for all three thresholds at each cut-off position.
 * Each threshold includes its own precision value, counts, and description.
 */
export interface MultiThresholdPrecisionWithContext {
  /** Precision@5 with multi-threshold breakdown */
  at5: {
    /** Threshold ≥1: Lenient precision (at least slightly relevant) */
    threshold1: PrecisionThresholdWithContext;
    /** Threshold ≥2: Standard precision (fairly or highly relevant) */
    threshold2: PrecisionThresholdWithContext;
    /** Threshold ≥3: Strict precision (highly relevant only) */
    threshold3: PrecisionThresholdWithContext;
  };
  /** Precision@10 with multi-threshold breakdown */
  at10: {
    /** Threshold ≥1: Lenient precision (at least slightly relevant) */
    threshold1: PrecisionThresholdWithContext;
    /** Threshold ≥2: Standard precision (fairly or highly relevant) */
    threshold2: PrecisionThresholdWithContext;
    /** Threshold ≥3: Strict precision (highly relevant only) */
    threshold3: PrecisionThresholdWithContext;
  };
  /** Precision@15 with multi-threshold breakdown */
  at15: {
    /** Threshold ≥1: Lenient precision (at least slightly relevant) */
    threshold1: PrecisionThresholdWithContext;
    /** Threshold ≥2: Standard precision (fairly or highly relevant) */
    threshold2: PrecisionThresholdWithContext;
    /** Threshold ≥3: Strict precision (highly relevant only) */
    threshold3: PrecisionThresholdWithContext;
  };
  /** Precision@All with multi-threshold breakdown */
  atAll: {
    /** Threshold ≥1: Lenient precision (at least slightly relevant) */
    threshold1: PrecisionThresholdWithContext;
    /** Threshold ≥2: Standard precision (fairly or highly relevant) */
    threshold2: PrecisionThresholdWithContext;
    /** Threshold ≥3: Strict precision (highly relevant only) */
    threshold3: PrecisionThresholdWithContext;
  };
}

/**
 * Precision metric with full context
 *
 * @deprecated Use MultiThresholdPrecisionWithContext instead
 * Old single-threshold precision metric with context (for migration compatibility)
 */
export interface PrecisionMetricWithContext {
  /** Mean precision across all samples (0-1, higher = more precise) */
  meanPrecision: number;
  /** Number of relevant items (score ≥ 2) in top-K */
  relevantCount: number;
  /** Total items in top-K */
  totalCount: number;
  /** Human-readable explanation */
  description: string;
}

/**
 * Rate metric with context (for percentage-based metrics)
 *
 * Includes both macro and micro averages for transparency:
 * - **Macro-average**: Average of sample rates (each sample weighted equally)
 * - **Micro-average**: Total count / total items (weighted by sample size)
 *
 * These can differ when sample sizes vary significantly.
 */
export interface RateMetricWithContext {
  /** Macro-average rate: average of sample rates (0-100) */
  macroAverageRate: number;
  /** Numerator count (summed across all samples) */
  count: number;
  /** Total count (denominator, summed across all samples) */
  totalCount: number;
  /** Micro-average rate: calculated from total counts (count/totalCount * 100) */
  microAverageRate: number;
  /** Human-readable explanation */
  description: string;
}

/**
 * Average relevance metric with context
 */
export interface AverageRelevanceWithContext {
  /** Mean relevance score across all courses (0-3 scale, higher = better) */
  meanRelevanceScore: number;
  /** Total relevance sum across all courses */
  totalRelevanceSum: number;
  /** Total number of courses */
  totalCourses: number;
  /** Human-readable explanation */
  description: string;
}

/**
 * Per-class rate with context (for enriched display)
 *
 * Shows both macro and micro averages for a specific relevance score class
 * with human-readable descriptions.
 */
export interface PerClassRateWithContext {
  /** The relevance score (0-3) */
  relevanceScore: RelevanceScore;
  /** Human-readable label */
  label:
    | 'irrelevant'
    | 'slightly_relevant'
    | 'fairly_relevant'
    | 'highly_relevant';
  /** Count of courses with this score */
  count: number;
  /** Total courses (for percentage calculation) */
  totalCount: number;
  /** Macro-average: average of per-sample rates (0-100) */
  macroAverageRate: number;
  /** Micro-average: count / totalCount * 100 (0-100) */
  microAverageRate: number;
  /** Human-readable explanation */
  description: string;
}

/**
 * Per-class distribution with context (for enriched display)
 *
 * Provides complete breakdown of all score classes with descriptions.
 */
export interface PerClassDistributionWithContext {
  /** Score 0: Irrelevant courses */
  score0: PerClassRateWithContext;
  /** Score 1: Slightly relevant courses */
  score1: PerClassRateWithContext;
  /** Score 2: Fairly relevant courses */
  score2: PerClassRateWithContext;
  /** Score 3: Highly relevant courses */
  score3: PerClassRateWithContext;
}

/**
 * Per-iteration metrics with rich descriptions
 *
 * IMPORTANT: Uses TREC-standard aggregation:
 * - Metrics calculated per-sample (question + skill pair)
 * - Then averaged (mean) across all samples
 * - This is the standard approach in IR evaluation (TREC, MS MARCO)
 *
 * Each metric includes context and descriptions for:
 * - Self-documentation (no need to lookup what each field means)
 * - Debugging (see numerator/denominator when investigating)
 * - Communication (easy to share with stakeholders)
 */
export interface CourseRetrievalIterationMetrics {
  /** Iteration number (1-indexed) */
  iteration: number;
  /** ISO timestamp when iteration completed */
  timestamp: string;
  /** Number of (question, skill) pairs evaluated */
  sampleCount: number;
  /** Total number of courses evaluated across all samples */
  totalCoursesEvaluated: number;

  // === RELEVANCE METRICS ===
  /**
   * Mean relevance score across all courses (0-3 scale)
   * Measures: On average, how relevant are the retrieved courses?
   */
  meanRelevanceScore: AverageRelevanceWithContext;

  /**
   * Per-class distribution with macro and micro averages
   *
   * Shows breakdown for each relevance score:
   * - Score 0: Irrelevant (no match)
   * - Score 1: Slightly relevant (weak connection)
   * - Score 2: Fairly relevant (moderate connection)
   * - Score 3: Highly relevant (strong match)
   *
   * Each score shows both macro and micro averages, revealing:
   * - Whether rates are consistent across samples
   * - Which score classes drive macro/micro differences
   */
  perClassDistribution: PerClassDistributionWithContext;

  // === RANKING QUALITY METRICS (NDCG) ===
  /**
   * NDCG@K: Measures ranking quality using LLM scores as relevance
   * Higher values indicate better ranking (relevant courses appear first)
   */
  ndcg: {
    /**
     * NDCG@5: Mean ranking quality of top 5 results
     * Measures: How well-ranked are the top 5 courses?
     */
    at5: NdcgMetricWithContext;

    /**
     * NDCG@10: Mean ranking quality of top 10 results
     * Measures: How well-ranked are the top 10 courses?
     */
    at10: NdcgMetricWithContext;

    /**
     * NDCG@15: Mean ranking quality of top 15 results
     * Measures: How well-ranked are the top 15 courses?
     */
    at15: NdcgMetricWithContext;

    /**
     * NDCG@All: Mean ranking quality across all results
     * Measures: What is the overall ranking quality?
     */
    atAll: NdcgMetricWithContext;
  };

  // === PRECISION METRICS ===
  /**
   * Precision@K: % of top-K courses that are relevant (multi-threshold)
   * Measures: Of the top K courses, what percentage are relevant at each threshold?
   *
   * **Multi-Threshold Breakdown**:
   * - Threshold 1 (lenient): Score ≥ 1 - "At least slightly relevant"
   * - Threshold 2 (standard): Score ≥ 2 - "Fairly or highly relevant" ← PRIMARY METRIC
   * - Threshold 3 (strict): Score ≥ 3 - "Highly relevant only"
   */
  precision: {
    /** Precision@5: Mean precision at top 5 with multi-threshold breakdown */
    at5: {
      /** Threshold ≥1: Lenient precision (at least slightly relevant) */
      threshold1: PrecisionThresholdWithContext;
      /** Threshold ≥2: Standard precision (fairly or highly relevant) */
      threshold2: PrecisionThresholdWithContext;
      /** Threshold ≥3: Strict precision (highly relevant only) */
      threshold3: PrecisionThresholdWithContext;
    };

    /** Precision@10: Mean precision at top 10 with multi-threshold breakdown */
    at10: {
      /** Threshold ≥1: Lenient precision (at least slightly relevant) */
      threshold1: PrecisionThresholdWithContext;
      /** Threshold ≥2: Standard precision (fairly or highly relevant) */
      threshold2: PrecisionThresholdWithContext;
      /** Threshold ≥3: Strict precision (highly relevant only) */
      threshold3: PrecisionThresholdWithContext;
    };

    /** Precision@15: Mean precision at top 15 with multi-threshold breakdown */
    at15: {
      /** Threshold ≥1: Lenient precision (at least slightly relevant) */
      threshold1: PrecisionThresholdWithContext;
      /** Threshold ≥2: Standard precision (fairly or highly relevant) */
      threshold2: PrecisionThresholdWithContext;
      /** Threshold ≥3: Strict precision (highly relevant only) */
      threshold3: PrecisionThresholdWithContext;
    };

    /** Precision@All: Mean precision across all retrieved courses with multi-threshold breakdown */
    atAll: {
      /** Threshold ≥1: Lenient precision (at least slightly relevant) */
      threshold1: PrecisionThresholdWithContext;
      /** Threshold ≥2: Standard precision (fairly or highly relevant) */
      threshold2: PrecisionThresholdWithContext;
      /** Threshold ≥3: Strict precision (highly relevant only) */
      threshold3: PrecisionThresholdWithContext;
    };
  };
}
