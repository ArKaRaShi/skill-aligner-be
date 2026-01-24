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

// ============================================================================
// ENRICHED METRIC TYPES (With Context and Descriptions)
// ============================================================================

/**
 * NDCG metric with full context
 * Follows course-relevance-filter pattern for clarity and self-documentation
 */
export interface NdcgMetricWithContext {
  /** NDCG value (0-1, higher = better ranking) */
  value: number;
  /** Human-readable explanation of what this metric means */
  description: string;
}

/**
 * Precision metric with full context
 */
export interface PrecisionMetricWithContext {
  /** Precision value (0-1, higher = more precise) */
  value: number;
  /** Number of relevant items (score ≥ 2) in top-K */
  relevantCount: number;
  /** Total items in top-K */
  totalCount: number;
  /** Human-readable explanation */
  description: string;
}

/**
 * Rate metric with context (for percentage-based metrics)
 */
export interface RateMetricWithContext {
  /** Rate as percentage (0-100) */
  value: number;
  /** Numerator count */
  count: number;
  /** Total count (denominator) */
  totalCount: number;
  /** Human-readable explanation */
  description: string;
}

/**
 * Average relevance metric with context
 */
export interface AverageRelevanceWithContext {
  /** Mean relevance score (0-3 scale, higher = better) */
  value: number;
  /** Total relevance sum across all courses */
  totalRelevanceSum: number;
  /** Total number of courses */
  totalCourses: number;
  /** Human-readable explanation */
  description: string;
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
   * Average LLM judge relevance score (0-3 scale)
   * Measures: On average, how relevant are the retrieved courses?
   */
  averageRelevance: AverageRelevanceWithContext;
  // example: { value: 1.33, totalRelevanceSum: 205, totalCourses: 154,
  //            description: "Mean relevance: 1.33/3 across 154 courses" }

  /**
   * Highly relevant courses (score 3)
   * Measures: What percentage of retrieved courses are highly relevant?
   */
  highlyRelevantRate: RateMetricWithContext;
  // example: { value: 14.29, count: 22, totalCount: 154,
  //            description: "22 of 154 courses (14.3%) are highly relevant" }

  /**
   * Irrelevant courses (score 0)
   * Measures: What percentage of retrieved courses are irrelevant?
   */
  irrelevantRate: RateMetricWithContext;
  // example: { value: 23.38, count: 36, totalCount: 154,
  //            description: "36 of 154 courses (23.4%) are irrelevant" }

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
    // example: { value: 0.692,
    //            description: "Mean NDCG@5: 0.69 - Top-5 results are reasonably ranked" }

    /**
     * NDCG@10: Mean ranking quality of top 10 results
     * Measures: How well-ranked are the top 10 courses?
     */
    at10: NdcgMetricWithContext;
    // example: { value: 0.824,
    //            description: "Mean NDCG@10: 0.82 - Top-10 results show good ranking" }

    /**
     * NDCG@All: Mean ranking quality across all results
     * Measures: What is the overall ranking quality?
     */
    atAll: NdcgMetricWithContext;
    // example: { value: 0.830,
    //            description: "Mean NDCG@All: 0.83 - Good overall ranking" }
  };

  // === PRECISION METRICS ===
  /**
   * Precision@K: % of top-K courses that are relevant (score ≥ 2)
   * Measures: Of the top K courses, what percentage are relevant?
   */
  precision: {
    /**
     * Precision@5: Mean precision at top 5
     * Measures: On average, what % of top-5 courses are relevant?
     */
    at5: PrecisionMetricWithContext;
    // example: { value: 0.471, relevantCount: 40, totalCount: 85,
    //            description: "8 of 17 samples (47.1%) have relevant top-5 courses" }

    /** Precision@10: Mean precision at top 10 */
    at10: PrecisionMetricWithContext;
    // example: { value: 0.425, relevantCount: 72, totalCount: 170,
    //            description: "7 of 17 samples (42.5%) have relevant top-10 courses" }

    /** Precision@All: Mean precision across all retrieved courses */
    atAll: PrecisionMetricWithContext;
    // example: { value: 0.418, relevantCount: 65, totalCount: 154,
    //            description: "Mean precision: 41.8% across all retrieved courses" }
  };
}
