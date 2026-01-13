import {
  AveragedMetrics,
  SkillMetrics,
  TestCaseMetrics,
} from '../test-sets/test-set.type';
import { RetrievalScoreDistribution } from '../types/course-retrieval.types';
import { DistributionCalculator } from './distribution-calculator';

/**
 * Aggregation Service
 *
 * Handles three-level aggregation for course retrieval evaluation:
 * 1. Skill Level → Test Case Level (macro/micro/pooled)
 * 2. Test Case Level → Iteration Level (macro/micro/pooled)
 *
 * Provides both macro (equal weight) and micro (weighted by count) averaging
 * for understanding performance from different perspectives.
 */
export class AggregationService {
  // ============================================================================
  // Three-Level Aggregation Methods
  // ============================================================================

  /**
   * Aggregate metrics across multiple skills for a test case
   *
   * Produces both macro (equal weight per skill) and micro (weighted by course count)
   * averages, along with pooled distributions.
   *
   * @param testCaseId - Test case identifier
   * @param question - The user's question
   * @param skillMetrics - Array of skill-level metrics
   * @returns Test case level metrics with macro/micro/pooled breakdown
   */
  static aggregateToTestCaseLevel(
    testCaseId: string,
    question: string,
    skillMetrics: SkillMetrics[],
  ): TestCaseMetrics {
    const totalSkills = skillMetrics.length;
    const totalCourses = skillMetrics.reduce(
      (sum, s) => sum + s.courseCount,
      0,
    );

    // Handle empty state
    if (totalSkills === 0 || totalCourses === 0) {
      return {
        testCaseId,
        question,
        totalSkills: 0,
        totalCourses: 0,
        timestamp: new Date().toISOString(),
        macroAvg: {
          averageSkillRelevance: 0,
          averageContextAlignment: 0,
          alignmentGap: 0,
          contextMismatchRate: 0,
        },
        microAvg: {
          averageSkillRelevance: 0,
          averageContextAlignment: 0,
          alignmentGap: 0,
          contextMismatchRate: 0,
        },
        pooled: {
          skillRelevanceDistribution: [],
          contextAlignmentDistribution: [],
        },
        skillMetrics: [],
      };
    }

    // Calculate macro average (equal weight per skill)
    const macroAvg = this.calculateMacroAverage(skillMetrics);

    // Calculate micro average (weighted by course count)
    const microAvg = this.calculateMicroAverage(skillMetrics);

    // Pool distributions across all skills
    const pooled = this.poolDistributions(skillMetrics);

    return {
      testCaseId,
      question,
      totalSkills,
      totalCourses,
      timestamp: new Date().toISOString(),
      macroAvg,
      microAvg,
      pooled,
      skillMetrics,
    };
  }

  /**
   * Calculate macro average (equal weight per skill)
   *
   * Each skill contributes equally to the average, regardless of
   * how many courses it has.
   *
   * @param skillMetrics - Array of skill-level metrics
   * @returns Macro-averaged metrics
   */
  static calculateMacroAverage(skillMetrics: SkillMetrics[]): AveragedMetrics {
    const count = skillMetrics.length;

    if (count === 0) {
      return {
        averageSkillRelevance: 0,
        averageContextAlignment: 0,
        alignmentGap: 0,
        contextMismatchRate: 0,
      };
    }

    const sumSkillRelevance = skillMetrics.reduce(
      (sum, s) => sum + s.averageSkillRelevance,
      0,
    );
    const sumContextAlignment = skillMetrics.reduce(
      (sum, s) => sum + s.averageContextAlignment,
      0,
    );
    const sumAlignmentGap = skillMetrics.reduce(
      (sum, s) => sum + s.alignmentGap,
      0,
    );
    const sumMismatchRate = skillMetrics.reduce(
      (sum, s) => sum + s.contextMismatchRate,
      0,
    );

    return {
      averageSkillRelevance: Number((sumSkillRelevance / count).toFixed(3)),
      averageContextAlignment: Number((sumContextAlignment / count).toFixed(3)),
      alignmentGap: Number((sumAlignmentGap / count).toFixed(3)),
      contextMismatchRate: Number((sumMismatchRate / count).toFixed(1)),
    };
  }

  /**
   * Calculate micro average (weighted by course count)
   *
   * Skills with more courses have proportionally more impact on the average.
   * This represents the "actual user experience" perspective.
   *
   * @param skillMetrics - Array of skill-level metrics with course counts
   * @returns Micro-weighted averages
   */
  static calculateMicroAverage(skillMetrics: SkillMetrics[]): AveragedMetrics {
    const totalCourses = skillMetrics.reduce(
      (sum, s) => sum + s.courseCount,
      0,
    );

    if (totalCourses === 0) {
      return {
        averageSkillRelevance: 0,
        averageContextAlignment: 0,
        alignmentGap: 0,
        contextMismatchRate: 0,
      };
    }

    // Weight each skill's metrics by its course count
    const weightedSkillRelevance = skillMetrics.reduce(
      (sum, s) => sum + s.averageSkillRelevance * s.courseCount,
      0,
    );
    const weightedContextAlignment = skillMetrics.reduce(
      (sum, s) => sum + s.averageContextAlignment * s.courseCount,
      0,
    );
    const weightedAlignmentGap = skillMetrics.reduce(
      (sum, s) => sum + s.alignmentGap * s.courseCount,
      0,
    );

    // For mismatch rate, we need to pool all courses and calculate
    const allEvaluations = skillMetrics.flatMap((s) => s.evaluations);
    const totalMismatchCourses = allEvaluations.filter(
      (e) => e.skillRelevance >= 2 && e.contextAlignment <= 1,
    ).length;
    const pooledMismatchRate =
      (totalMismatchCourses / allEvaluations.length) * 100;

    return {
      averageSkillRelevance: Number(
        (weightedSkillRelevance / totalCourses).toFixed(3),
      ),
      averageContextAlignment: Number(
        (weightedContextAlignment / totalCourses).toFixed(3),
      ),
      alignmentGap: Number((weightedAlignmentGap / totalCourses).toFixed(3)),
      contextMismatchRate: Number(pooledMismatchRate.toFixed(1)),
    };
  }

  /**
   * Pool distributions across multiple skills
   *
   * Collects all individual scores from all courses and calculates
   * the overall distribution.
   *
   * @param skillMetrics - Array of skill-level metrics
   * @returns Pooled score distributions
   */
  static poolDistributions(skillMetrics: SkillMetrics[]): {
    skillRelevanceDistribution: RetrievalScoreDistribution[];
    contextAlignmentDistribution: RetrievalScoreDistribution[];
  } {
    // Pool all individual scores
    const allSkillScores = skillMetrics.flatMap((s) =>
      s.evaluations.map((e) => e.skillRelevance),
    );
    const allContextScores = skillMetrics.flatMap((s) =>
      s.evaluations.map((e) => e.contextAlignment),
    );

    const total = allSkillScores.length;

    if (total === 0) {
      return {
        skillRelevanceDistribution: [],
        contextAlignmentDistribution: [],
      };
    }

    return {
      skillRelevanceDistribution: DistributionCalculator.calculateDistribution(
        allSkillScores,
        total,
      ),
      contextAlignmentDistribution:
        DistributionCalculator.calculateDistribution(allContextScores, total),
    };
  }

  /**
   * Aggregate test case metrics to iteration level
   *
   * Produces both macro (equal weight per test case) and micro (weighted by course count)
   * averages at the iteration level.
   *
   * @param iterationNumber - Iteration number
   * @param testCaseMetrics - Array of test case metrics
   * @returns Enhanced iteration metrics with macro/micro/pooled breakdown
   */
  static aggregateToIterationLevel(
    iterationNumber: number,
    testCaseMetrics: TestCaseMetrics[],
  ): {
    macroAvg: AveragedMetrics;
    microAvg: AveragedMetrics;
    pooled: {
      skillRelevanceDistribution: RetrievalScoreDistribution[];
      contextAlignmentDistribution: RetrievalScoreDistribution[];
    };
    totalContextMismatches: number;
  } {
    // Calculate macro average (equal weight per test case)
    const macroAvg = this.calculateMacroAverageForTestCases(testCaseMetrics);

    // Calculate micro average (weighted by course count)
    const microAvg = this.calculateMicroAverageForTestCases(testCaseMetrics);

    // Pool distributions across all test cases
    const pooled = this.poolDistributionsForTestCases(testCaseMetrics);

    // Count total context mismatches
    const totalContextMismatches = testCaseMetrics.reduce(
      (sum, tc) =>
        sum +
        tc.skillMetrics.reduce(
          (skillSum, sm) => skillSum + sm.contextMismatchCourses.length,
          0,
        ),
      0,
    );

    return {
      macroAvg,
      microAvg,
      pooled,
      totalContextMismatches,
    };
  }

  /**
   * Calculate macro average for test cases (equal weight per test case)
   *
   * @param testCaseMetrics - Array of test case metrics
   * @returns Macro-averaged metrics
   */
  private static calculateMacroAverageForTestCases(
    testCaseMetrics: TestCaseMetrics[],
  ): AveragedMetrics {
    const count = testCaseMetrics.length;

    if (count === 0) {
      return {
        averageSkillRelevance: 0,
        averageContextAlignment: 0,
        alignmentGap: 0,
        contextMismatchRate: 0,
      };
    }

    const sumSkillRelevance = testCaseMetrics.reduce(
      (sum, tc) => sum + tc.macroAvg.averageSkillRelevance,
      0,
    );
    const sumContextAlignment = testCaseMetrics.reduce(
      (sum, tc) => sum + tc.macroAvg.averageContextAlignment,
      0,
    );
    const sumAlignmentGap = testCaseMetrics.reduce(
      (sum, tc) => sum + tc.macroAvg.alignmentGap,
      0,
    );
    const sumMismatchRate = testCaseMetrics.reduce(
      (sum, tc) => sum + tc.macroAvg.contextMismatchRate,
      0,
    );

    return {
      averageSkillRelevance: Number((sumSkillRelevance / count).toFixed(3)),
      averageContextAlignment: Number((sumContextAlignment / count).toFixed(3)),
      alignmentGap: Number((sumAlignmentGap / count).toFixed(3)),
      contextMismatchRate: Number((sumMismatchRate / count).toFixed(1)),
    };
  }

  /**
   * Calculate micro average for test cases (weighted by course count)
   *
   * @param testCaseMetrics - Array of test case metrics
   * @returns Micro-weighted averages
   */
  private static calculateMicroAverageForTestCases(
    testCaseMetrics: TestCaseMetrics[],
  ): AveragedMetrics {
    const totalCourses = testCaseMetrics.reduce(
      (sum, tc) => sum + tc.totalCourses,
      0,
    );

    if (totalCourses === 0) {
      return {
        averageSkillRelevance: 0,
        averageContextAlignment: 0,
        alignmentGap: 0,
        contextMismatchRate: 0,
      };
    }

    // Weight each test case's micro metrics by its total course count
    const weightedSkillRelevance = testCaseMetrics.reduce(
      (sum, tc) => sum + tc.microAvg.averageSkillRelevance * tc.totalCourses,
      0,
    );
    const weightedContextAlignment = testCaseMetrics.reduce(
      (sum, tc) => sum + tc.microAvg.averageContextAlignment * tc.totalCourses,
      0,
    );
    const weightedAlignmentGap = testCaseMetrics.reduce(
      (sum, tc) => sum + tc.microAvg.alignmentGap * tc.totalCourses,
      0,
    );

    // For mismatch rate, pool across all test cases
    const allEvaluations = testCaseMetrics.flatMap((tc) =>
      tc.skillMetrics.flatMap((sm) => sm.evaluations),
    );
    const totalMismatchCourses = allEvaluations.filter(
      (e) => e.skillRelevance >= 2 && e.contextAlignment <= 1,
    ).length;
    const pooledMismatchRate =
      (totalMismatchCourses / allEvaluations.length) * 100;

    return {
      averageSkillRelevance: Number(
        (weightedSkillRelevance / totalCourses).toFixed(3),
      ),
      averageContextAlignment: Number(
        (weightedContextAlignment / totalCourses).toFixed(3),
      ),
      alignmentGap: Number((weightedAlignmentGap / totalCourses).toFixed(3)),
      contextMismatchRate: Number(pooledMismatchRate.toFixed(1)),
    };
  }

  /**
   * Pool distributions across test cases
   *
   * @param testCaseMetrics - Array of test case metrics
   * @returns Pooled score distributions
   */
  private static poolDistributionsForTestCases(
    testCaseMetrics: TestCaseMetrics[],
  ): {
    skillRelevanceDistribution: RetrievalScoreDistribution[];
    contextAlignmentDistribution: RetrievalScoreDistribution[];
  } {
    // Pool all individual scores from all test cases
    const allSkillScores = testCaseMetrics.flatMap((tc) =>
      tc.skillMetrics.flatMap((sm) =>
        sm.evaluations.map((e) => e.skillRelevance),
      ),
    );
    const allContextScores = testCaseMetrics.flatMap((tc) =>
      tc.skillMetrics.flatMap((sm) =>
        sm.evaluations.map((e) => e.contextAlignment),
      ),
    );

    const total = allSkillScores.length;

    if (total === 0) {
      return {
        skillRelevanceDistribution: [],
        contextAlignmentDistribution: [],
      };
    }

    return {
      skillRelevanceDistribution: DistributionCalculator.calculateDistribution(
        allSkillScores,
        total,
      ),
      contextAlignmentDistribution:
        DistributionCalculator.calculateDistribution(allContextScores, total),
    };
  }
}
