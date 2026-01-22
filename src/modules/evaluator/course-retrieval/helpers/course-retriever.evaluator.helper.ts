import { encode } from '@toon-format/toon';

import { LlmCourseEvaluationItem } from '../schemas/schema';
import {
  AveragedMetrics,
  SkillMetrics,
  TestCaseMetrics,
} from '../test-sets/test-set.type';
import {
  CourseInfo,
  EvaluationItem,
  LlmCouresInfo,
  RetrievalPerformanceReport,
  RetrievalScoreDistribution,
} from '../types/course-retrieval.types';

export class CourseRetrieverEvaluatorHelper {
  /**
   * Maps LLM evaluation items to evaluation items
   *
   * @param evaluations - LLM course evaluation items
   * @returns Mapped evaluation items
   */
  static mapEvaluations(
    evaluations: LlmCourseEvaluationItem[],
  ): EvaluationItem[] {
    return evaluations.map((evalItem) => ({
      subjectCode: evalItem.course_code,
      subjectName: evalItem.course_name,
      skillRelevance: evalItem.skill_relevance_score,
      skillReason: evalItem.skill_reason,
      contextAlignment: evalItem.context_alignment_score,
      contextReason: evalItem.context_reason,
    }));
  }

  /**
   * Calculates retrieval performance metrics from evaluations
   *
   * @param evaluations - List of evaluation items
   * @returns Retrieval performance report with metrics
   */
  static calculateMetrics(
    evaluations: EvaluationItem[],
  ): RetrievalPerformanceReport {
    const total = evaluations.length;

    // Handle empty state to avoid NaN (Division by Zero)
    if (total === 0) {
      return {
        averageSkillRelevance: 0,
        averageContextAlignment: 0,
        alignmentGap: 0,
        contextMismatchRate: 0,
        skillRelevanceDistribution: [],
        contextAlignmentDistribution: [],
        contextMismatchCourses: [],
      };
    }

    // 1. Calculate Averages
    const [totalSkill, totalContext] = evaluations.reduce(
      (acc, item) => {
        // total skill relevance
        acc[0] += item.skillRelevance;

        // total context alignment
        acc[1] += item.contextAlignment;
        return acc;
      },
      [0, 0],
    );

    const averageSkillRelevance = totalSkill / total;
    const averageContextAlignment = totalContext / total;

    // 2. Calculate Context Mismatch Rate
    // Definition: The Retriever found the "Ingredient" (Skill >= 2),
    // but the "Meal" was wrong (Context <= 1).
    const contextMismatchCourses = evaluations.filter(
      (item) => item.skillRelevance >= 2 && item.contextAlignment <= 1,
    );

    const contextMismatchRate = (contextMismatchCourses.length / total) * 100;

    // 3. Calculate Distributions
    const skillRelevanceDistribution = this.calculateDistribution(
      evaluations.map((e) => e.skillRelevance),
      total,
    );
    const contextAlignmentDistribution = this.calculateDistribution(
      evaluations.map((e) => e.contextAlignment),
      total,
    );

    return {
      averageSkillRelevance,
      averageContextAlignment,
      // 4. The Gap: Positive number means "Good at Topic, Bad at User Fit"
      alignmentGap: averageSkillRelevance - averageContextAlignment,
      contextMismatchRate,
      skillRelevanceDistribution,
      contextAlignmentDistribution,
      contextMismatchCourses,
    };
  }

  /**
   * Calculates score distribution from a list of scores
   *
   * @param scores - Array of relevance scores
   * @param total - Total number of items
   * @returns Score distribution with counts and percentages
   */
  static calculateDistribution(
    scores: number[],
    total: number,
  ): RetrievalScoreDistribution[] {
    const distribution = new Map<number, number>();

    for (const score of scores) {
      distribution.set(score, (distribution.get(score) ?? 0) + 1);
    }

    return Array.from(distribution.entries()).map(([score, count]) => ({
      relevanceScore: score as 0 | 1 | 2 | 3,
      count,
      percentage: (count / total) * 100,
    }));
  }

  /**
   * Builds the context string for retrieved courses
   *
   * @param courses - list of course info
   * @returns encoded string representation of courses
   */
  static buildRetrievedCoursesContext(courses: CourseInfo[]): string {
    const llmCourses: LlmCouresInfo[] = courses.map((course) => ({
      course_code: course.subjectCode,
      course_name: course.subjectName,
      learning_outcomes: course.cleanedLearningOutcomes,
    }));
    return encode(llmCourses);
  }

  // ============================================================================
  // Three-Level Aggregation Methods (NEW)
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
      skillRelevanceDistribution: this.calculateDistribution(
        allSkillScores,
        total,
      ),
      contextAlignmentDistribution: this.calculateDistribution(
        allContextScores,
        total,
      ),
    };
  }

  /**
   * Aggregate test case metrics to iteration level
   *
   * Produces both macro (equal weight per test case) and micro (weighted by course count)
   * averages at the iteration level.
   *
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
      skillRelevanceDistribution: this.calculateDistribution(
        allSkillScores,
        total,
      ),
      contextAlignmentDistribution: this.calculateDistribution(
        allContextScores,
        total,
      ),
    };
  }
}
