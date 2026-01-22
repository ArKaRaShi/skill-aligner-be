import {
  CourseInfo,
  EvaluationItem,
  RetrievalPerformanceReport,
  RetrievalScoreDistribution,
} from '../types/course-retrieval.types';

/**
 * Single test case for course retriever evaluation
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
};

// ============================================================================
// Result Types
// ============================================================================

/**
 * Metrics calculated for a single iteration
 *
 * Aggregates results across all test cases in one iteration run.
 */
export type IterationMetrics = {
  /** Iteration number */
  iterationNumber: number;
  /** Number of test cases in this iteration */
  totalCases: number;
  /** Average skill relevance across all test cases (0-3) */
  averageSkillRelevance: number;
  /** Average context alignment across all test cases (0-3) */
  averageContextAlignment: number;
  /** Average alignment gap (skill - context) */
  averageAlignmentGap: number;
  /** Overall context mismatch rate (0-100%) */
  contextMismatchRate: number;
  /** Total courses with context mismatches */
  totalContextMismatches: number;
  /** Total input tokens consumed */
  totalInputTokens: number;
  /** Total output tokens consumed */
  totalOutputTokens: number;
  /** ISO timestamp of when metrics were calculated */
  timestamp: string;
};

/**
 * Metrics aggregated across multiple iterations
 *
 * Provides statistical summary (mean, min, max) across
 * all iteration runs for a test set, for both macro and micro averages.
 */
export type AggregateMetrics = {
  /** Test set identifier */
  testSetName: string;
  /** Total number of iterations */
  totalIterations: number;
  /** Number of test cases per iteration */
  testSetSize: number;

  // Macro-averaged metrics (equal weight per test case)
  macro: {
    /** Mean average skill relevance across iterations */
    meanSkillRelevance: number;
    /** Min average skill relevance across iterations */
    minSkillRelevance: number;
    /** Max average skill relevance across iterations */
    maxSkillRelevance: number;
    /** Mean average context alignment across iterations */
    meanContextAlignment: number;
    /** Min average context alignment across iterations */
    minContextAlignment: number;
    /** Max average context alignment across iterations */
    maxContextAlignment: number;
    /** Mean alignment gap across iterations */
    meanAlignmentGap: number;
    /** Mean context mismatch rate across iterations */
    meanMismatchRate: number;
  };

  // Micro-averaged metrics (weighted by course count)
  micro: {
    /** Mean average skill relevance across iterations */
    meanSkillRelevance: number;
    /** Min average skill relevance across iterations */
    minSkillRelevance: number;
    /** Max average skill relevance across iterations */
    maxSkillRelevance: number;
    /** Mean average context alignment across iterations */
    meanContextAlignment: number;
    /** Min average context alignment across iterations */
    minContextAlignment: number;
    /** Max average context alignment across iterations */
    maxContextAlignment: number;
    /** Mean alignment gap across iterations */
    meanAlignmentGap: number;
    /** Mean context mismatch rate across iterations */
    meanMismatchRate: number;
  };

  /** Per-iteration metrics breakdown */
  iterationMetrics: EnhancedIterationMetrics[];
  /** ISO timestamp */
  timestamp: string;
};

/**
 * Final aggregated metrics file
 *
 * This is the top-level summary file that gets written to
 * aggregate-metrics/final-metrics-{totalIterations}-{testSetSize}.json
 */
export type FinalMetrics = {
  /** Test set identifier */
  testSetName: string;
  /** Total number of iterations completed */
  totalIterations: number;
  /** Number of test cases in the set */
  testSetSize: number;

  /** Overall macro-averaged metrics across all iterations */
  macroOverall: {
    meanSkillRelevance: number;
    meanContextAlignment: number;
    meanAlignmentGap: number;
    meanMismatchRate: number;
  };

  /** Overall micro-averaged metrics across all iterations */
  microOverall: {
    meanSkillRelevance: number;
    meanContextAlignment: number;
    meanAlignmentGap: number;
    meanMismatchRate: number;
  };

  /** Detailed per-iteration metrics */
  iterationMetrics: EnhancedIterationMetrics[];
  /** ISO timestamp */
  timestamp: string;
};

/**
 * Context mismatch entry for tracking
 *
 * Individual course-level mismatches are tracked separately
 * for analysis and improvement.
 */
export type ContextMismatchEntry = {
  /** ISO timestamp */
  timestamp: string;
  /** Test case ID */
  testCaseId?: string;
  /** Question that produced the mismatch */
  question: string;
  /** Skill being searched for */
  skill: string;
  /** Number of courses retrieved */
  retrievedCount: number;
  /** Courses with high skill but low context alignment */
  mismatches: {
    subjectCode: string;
    subjectName: string;
    skillRelevance: number;
    contextAlignment: number;
  }[];
  /** Iteration number (if available) */
  iterationNumber?: number;
};

// ============================================================================
// Three-Level Aggregation Types (NEW)
// ============================================================================

/**
 * Skill-level metrics with course count
 *
 * Extends the base RetrievalPerformanceReport with metadata
 * for aggregation purposes.
 */
export type SkillMetrics = RetrievalPerformanceReport & {
  /** Number of courses evaluated for this skill */
  courseCount: number;
  /** Name of the skill */
  skillName: string;
  /** All evaluation items for this skill */
  evaluations: EvaluationItem[];
};

/**
 * Averaged metrics with gap and mismatch rate
 *
 * Shared structure for both macro and micro averages.
 */
export type AveragedMetrics = {
  /** Average skill relevance (0-3) */
  averageSkillRelevance: number;
  /** Average context alignment (0-3) */
  averageContextAlignment: number;
  /** Average alignment gap (skill - context) */
  alignmentGap: number;
  /** Context mismatch rate (0-100%) */
  contextMismatchRate: number;
};

/**
 * Test case level metrics
 *
 * Aggregates metrics across multiple skills within a single test case.
 * Provides both macro (equal weight) and micro (weighted by count) averages.
 */
export type TestCaseMetrics = {
  /** Test case identifier */
  testCaseId: string;
  /** The user's question */
  question: string;
  /** Total number of skills in this test case */
  totalSkills: number;
  /** Total number of courses across all skills */
  totalCourses: number;
  /** ISO timestamp */
  timestamp: string;

  /**
   * Macro-averaged metrics (each skill gets equal weight)
   *
   * Use this to answer: "How consistent is performance across different skills?"
   */
  macroAvg: AveragedMetrics;

  /**
   * Micro-weighted metrics (weighted by course count)
   *
   * Use this to answer: "What is the actual user experience?"
   * Skills with more courses have proportionally more impact.
   */
  microAvg: AveragedMetrics;

  /**
   * Pooled distributions across all skills
   *
   * All individual scores from all courses pooled together.
   * Useful for overall score distribution analysis.
   */
  pooled: {
    skillRelevanceDistribution: RetrievalScoreDistribution[];
    contextAlignmentDistribution: RetrievalScoreDistribution[];
  };

  /**
   * Per-skill breakdown
   *
   * Individual metrics for each skill in the test case.
   */
  skillMetrics: SkillMetrics[];
};

/**
 * Enhanced iteration metrics
 *
 * Replaces the simple IterationMetrics with three-level aggregation.
 * Provides both macro and micro perspectives on performance.
 */
export type EnhancedIterationMetrics = {
  /** Iteration number */
  iterationNumber: number;
  /** Number of test cases in this iteration */
  totalCases: number;
  /** Total input tokens consumed */
  totalInputTokens: number;
  /** Total output tokens consumed */
  totalOutputTokens: number;
  /** ISO timestamp */
  timestamp: string;

  /**
   * Macro-averaged metrics across all test cases
   *
   * Each test case gets equal weight.
   */
  macroAvg: AveragedMetrics;

  /**
   * Micro-weighted metrics across all test cases
   *
   * Test cases with more courses have proportionally more weight.
   */
  microAvg: AveragedMetrics;

  /**
   * Pooled distributions across all skills in this iteration
   *
   * All individual scores from all courses in all test cases.
   */
  pooled: {
    skillRelevanceDistribution: RetrievalScoreDistribution[];
    contextAlignmentDistribution: RetrievalScoreDistribution[];
  };

  /**
   * Total context mismatches across iteration
   */
  totalContextMismatches: number;

  /**
   * Per-test-case breakdown
   *
   * Individual metrics for each test case in the iteration.
   */
  testCaseMetrics: TestCaseMetrics[];
};
