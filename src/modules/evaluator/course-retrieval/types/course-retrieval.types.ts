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
};

/**
 * Template literal type for test set identifiers
 *
 * Ensures type safety when referencing test sets by name.
 */
export type TestSetIdentifier = `test-set-v${number}`;

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

// ============================================================================
// PROXY METRIC TYPES (NDCG and Precision)
// ============================================================================

/**
 * NDCG (Normalized Discounted Cumulative Gain) metrics
 *
 * **Proxy Metric Notice**: These metrics use LLM judge scores as relevance.
 * Without ground truth labels, IDCG is calculated from the ideal ranking
 * of the judge's own scores (sorted descending), not from perfect ground truth.
 *
 * NDCG measures ranking quality: how close is the actual ranking to the
 * ideal ranking according to the judge?
 *
 * Values range from 0-1, where 1 = perfect ranking (scores in descending order).
 */
export interface NdcgMetrics {
  /** NDCG@5: ranking quality of top 5 results */
  at5: number;
  /** NDCG@10: ranking quality of top 10 results */
  at10: number;
  /** NDCG@all: ranking quality of all results */
  atAll: number;
}

/**
 * Precision@K metrics
 *
 * **Proxy Metric Notice**: These metrics use LLM judge scores as relevance.
 * "Relevant" is defined as score ≥ 2 (fairly or highly relevant).
 * Without ground truth, we cannot calculate true Recall or F1.
 *
 * Precision@K measures: "Of the top K results, how many are relevant?"
 *
 * Values range from 0-1, where 1 = all top K courses are relevant.
 */
export interface PrecisionMetrics {
  /** Precision@5: % of top 5 with score ≥ 2 */
  at5: number;
  /** Precision@10: % of top 10 with score ≥ 2 */
  at10: number;
  /** Precision@all: % of all results with score ≥ 2 */
  atAll: number;
}

/**
 * Retrieval performance metrics (simplified, flat structure)
 *
 * Follows the modern evaluator pattern with simple aggregated metrics
 * instead of the legacy three-level aggregation system.
 *
 * **Proxy Metrics**: NDCG and Precision use LLM judge scores as relevance.
 * See NdcgMetrics and PrecisionMetrics for detailed notices.
 */
export type RetrievalPerformanceMetrics = {
  /** Total number of courses evaluated */
  totalCourses: number;
  /** Average relevance score across all courses (0-3) */
  averageRelevance: number;
  /** Distribution of scores across all courses */
  scoreDistribution: RetrievalScoreDistribution[];
  /** Number of highly relevant courses (score 3) */
  highlyRelevantCount: number;
  /** Percentage of highly relevant courses */
  highlyRelevantRate: number;
  /** Number of irrelevant courses (score 0) */
  irrelevantCount: number;
  /** Percentage of irrelevant courses */
  irrelevantRate: number;
  /** NDCG metrics (ranking quality, proxy metric) */
  ndcg: NdcgMetrics;
  /** Precision@K metrics (proxy metric) */
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
 */
export type CourseRetrievalProgressEntry = {
  /** SHA256 hash for deduplication */
  hash: string;
  /** The user's question */
  question: string;
  /** The skill being evaluated */
  skill: string;
  /** Test case ID if present */
  testCaseId?: string;
  /** ISO timestamp when completed */
  completedAt: string;
  /** Evaluation result for progress tracking (simplified metrics) */
  result: {
    /** Number of courses retrieved */
    retrievedCount: number;
    /** Average relevance score */
    averageRelevance: number;
  };
};

/**
 * Progress file for crash recovery
 *
 * Tracks evaluation progress across multiple samples.
 */
export type CourseRetrievalProgressFile = {
  /** Test set name */
  testSetName: string;
  /** Iteration number */
  iterationNumber: number;
  /** Completed entries */
  entries: CourseRetrievalProgressEntry[];
  /** Last update timestamp */
  lastUpdated: string;
  /** Statistics */
  statistics: {
    /** Total items to evaluate */
    totalItems: number;
    /** Completed items */
    completedItems: number;
    /** Pending items */
    pendingItems: number;
    /** Completion percentage */
    completionPercentage: number;
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
  atAll: StatisticalMetric;
}

/**
 * Precision metrics with statistics
 */
export interface PrecisionAggregateMetrics {
  at5: StatisticalMetric;
  at10: StatisticalMetric;
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
    ndcgAtAll: StatisticalMetric;

    // Precision metrics (% relevant in top K)
    precisionAt5: StatisticalMetric;
    precisionAt10: StatisticalMetric;
    precisionAtAll: StatisticalMetric;

    // Existing basic metrics
    totalCoursesEvaluated: StatisticalMetric;
    averageRelevance: StatisticalMetric;
    highlyRelevantRate: StatisticalMetric;
    irrelevantRate: StatisticalMetric;
  };
  /** Per-iteration breakdown for trend analysis */
  perIterationMetrics: CourseRetrievalIterationMetrics[];
}

/**
 * Per-iteration metrics (saved in metrics-iteration-{N}.json)
 *
 * Calculated for each iteration separately to enable:
 * - Trend analysis (improvement/degradation over time)
 * - Debugging specific iterations
 * - Intermediate reporting
 */
export interface CourseRetrievalIterationMetrics {
  /** Iteration number (1-indexed) */
  iteration: number;
  /** ISO timestamp when iteration completed */
  timestamp: string;
  /** Number of test cases evaluated in this iteration */
  sampleCount: number;
  /** Total number of courses evaluated across all test cases */
  totalCoursesEvaluated: number;
  /** Average relevance score (0-3) for this iteration */
  averageRelevance: number;
  /** Percentage of highly relevant courses (score 3) */
  highlyRelevantRate: number;
  /** Percentage of irrelevant courses (score 0) */
  irrelevantRate: number;

  // NDCG metrics for this iteration
  /** NDCG@5 ranking quality */
  ndcgAt5: number;
  /** NDCG@10 ranking quality */
  ndcgAt10: number;
  /** NDCG@all ranking quality */
  ndcgAtAll: number;

  // Precision metrics for this iteration
  /** Precision@5 (% of top 5 that are relevant) */
  precisionAt5: number;
  /** Precision@10 (% of top 10 that are relevant) */
  precisionAt10: number;
  /** Precision@all (% of all that are relevant) */
  precisionAtAll: number;
}
