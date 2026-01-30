import { LlmCourseEvaluationItem } from '../schemas/schema';
import {
  CourseInfo,
  EvaluationItem,
  RetrievalPerformanceMetrics,
} from '../types/course-retrieval.types';
import { NdcgCalculator } from './ndcg-calculator.helper';
import { PrecisionCalculator } from './precision-calculator.helper';

export class CourseRetrieverEvaluatorHelper {
  /**
   * Maps LLM evaluation items to evaluation items
   *
   * @param evaluations - LLM course evaluation items
   * @param courses - Original course info for subjectCode/subjectName mapping
   * @returns Mapped evaluation items
   */
  static mapEvaluations(
    evaluations: LlmCourseEvaluationItem[],
    courses: Array<{ subjectCode: string; subjectName: string }>,
  ): EvaluationItem[] {
    // Create a lookup map for course names by code
    const courseMap = new Map(
      courses.map((c) => [c.subjectCode, c.subjectName]),
    );

    return evaluations.map((evalItem) => ({
      subjectCode: evalItem.code,
      subjectName: courseMap.get(evalItem.code) || evalItem.code, // Fallback to code if name not found
      relevanceScore: evalItem.score,
      reason: evalItem.reason,
    }));
  }

  /**
   * Calculates retrieval performance metrics from evaluations
   *
   * @param evaluations - List of evaluation items
   * @returns Retrieval performance metrics with single-score model
   * @deprecated Use CourseRetrievalMetricsCalculator.calculateMetrics instead
   */
  static calculateMetrics(
    evaluations: EvaluationItem[],
  ): RetrievalPerformanceMetrics {
    const total = evaluations.length;

    // Handle empty state to avoid NaN
    if (total === 0) {
      return {
        totalCourses: 0,
        meanRelevanceScore: 0,
        totalRelevanceSum: 0,
        perClassDistribution: {
          score0: {
            relevanceScore: 0,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'irrelevant',
          },
          score1: {
            relevanceScore: 1,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'slightly_relevant',
          },
          score2: {
            relevanceScore: 2,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'highly_relevant',
          },
        },
        ndcg: {
          proxy: { at5: 0, at10: 0, at15: 0, atAll: 0 },
          ideal: { at5: 0, at10: 0, at15: 0, atAll: 0 },
        },
        precision: {
          at5: { threshold1: 0, threshold2: 0, threshold3: 0 },
          at10: { threshold1: 0, threshold2: 0, threshold3: 0 },
          at15: { threshold1: 0, threshold2: 0, threshold3: 0 },
          atAll: { threshold1: 0, threshold2: 0, threshold3: 0 },
        },
      };
    }

    // Calculate mean relevance score
    const totalRelevance = evaluations.reduce(
      (sum, item) => sum + item.relevanceScore,
      0,
    );
    const meanRelevanceScore = totalRelevance / total;

    // Calculate per-class distribution
    const perClassDistribution = this.calculatePerClassDistribution(
      evaluations.map((e) => e.relevanceScore),
      total,
    );

    // Extract relevance scores for NDCG and Precision calculations
    const relevanceScores = evaluations.map((e) => e.relevanceScore);

    // Calculate NDCG metrics (both proxy and ideal variants)
    const ndcgProxyAt5 = NdcgCalculator.calculateProxyNDCG(relevanceScores, 5);
    const ndcgProxyAt10 = NdcgCalculator.calculateProxyNDCG(
      relevanceScores,
      10,
    );
    const ndcgProxyAt15 = NdcgCalculator.calculateProxyNDCG(
      relevanceScores,
      15,
    );
    const ndcgProxyAtAll = NdcgCalculator.calculateProxyNDCG(
      relevanceScores,
      total,
    );

    const ndcgIdealAt5 = NdcgCalculator.calculateIdealNDCG(relevanceScores, 5);
    const ndcgIdealAt10 = NdcgCalculator.calculateIdealNDCG(
      relevanceScores,
      10,
    );
    const ndcgIdealAt15 = NdcgCalculator.calculateIdealNDCG(
      relevanceScores,
      15,
    );
    const ndcgIdealAtAll = NdcgCalculator.calculateIdealNDCG(
      relevanceScores,
      total,
    );

    // Calculate Precision@K metrics with multi-threshold support
    const precisionAt5 =
      PrecisionCalculator.calculateMultiThresholdPrecisionAtK(
        relevanceScores,
        5,
      );
    const precisionAt10 =
      PrecisionCalculator.calculateMultiThresholdPrecisionAtK(
        relevanceScores,
        10,
      );
    const precisionAt15 =
      PrecisionCalculator.calculateMultiThresholdPrecisionAtK(
        relevanceScores,
        15,
      );
    const precisionAtAll =
      PrecisionCalculator.calculateMultiThresholdPrecisionAtK(
        relevanceScores,
        total,
      );

    return {
      totalCourses: total,
      meanRelevanceScore,
      totalRelevanceSum: totalRelevance,
      perClassDistribution,
      ndcg: {
        proxy: {
          at5: ndcgProxyAt5,
          at10: ndcgProxyAt10,
          at15: ndcgProxyAt15,
          atAll: ndcgProxyAtAll,
        },
        ideal: {
          at5: ndcgIdealAt5,
          at10: ndcgIdealAt10,
          at15: ndcgIdealAt15,
          atAll: ndcgIdealAtAll,
        },
      },
      precision: {
        at5: precisionAt5,
        at10: precisionAt10,
        at15: precisionAt15,
        atAll: precisionAtAll,
      },
    };
  }

  /**
   * Calculates per-class distribution from scores
   *
   * @param scores - Array of relevance scores
   * @param total - Total number of items
   * @returns Per-class distribution with counts and rates
   */
  static calculatePerClassDistribution(
    scores: number[],
    total: number,
  ): RetrievalPerformanceMetrics['perClassDistribution'] {
    // Initialize counts for all possible scores (0-3)
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };

    // Count occurrences of each score
    for (const score of scores) {
      counts[score as keyof typeof counts]++;
    }

    // Calculate rates (same for both macro and micro in single sample)
    const createRate = (
      score: 0 | 1 | 2 | 3,
      label:
        | 'irrelevant'
        | 'slightly_relevant'
        | 'fairly_relevant'
        | 'highly_relevant',
    ) => ({
      relevanceScore: score,
      count: counts[score],
      macroAverageRate: total > 0 ? (counts[score] * 100) / total : 0,
      microAverageRate: total > 0 ? (counts[score] * 100) / total : 0,
      label,
    });

    return {
      score0: createRate(0, 'irrelevant'),
      score1: createRate(1, 'slightly_relevant'),
      score2: createRate(2, 'fairly_relevant'),
      score3: createRate(3, 'highly_relevant'),
    };
  }

  /**
   * Builds the context string for retrieved courses
   *
   * Converts courses array to formatted JSON string for LLM consumption.
   * Uses snake_case keys to match the schema expected by the LLM.
   *
   * @param courses - list of course info
   * @returns formatted JSON string representation of courses
   */
  static buildRetrievedCoursesContext(courses: CourseInfo[]): string {
    const coursesData = courses.map((course) => ({
      course_code: course.subjectCode,
      course_name: course.subjectName,
      learning_outcomes: course.cleanedLearningOutcomes,
    }));
    return JSON.stringify(coursesData, null, 2);
  }
}
