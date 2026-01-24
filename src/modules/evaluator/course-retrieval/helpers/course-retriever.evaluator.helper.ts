import { LlmCourseEvaluationItem } from '../schemas/schema';
import {
  CourseInfo,
  EvaluationItem,
  RetrievalPerformanceMetrics,
  RetrievalScoreDistribution,
} from '../types/course-retrieval.types';

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
   */
  static calculateMetrics(
    evaluations: EvaluationItem[],
  ): RetrievalPerformanceMetrics {
    const total = evaluations.length;

    // Handle empty state to avoid NaN
    if (total === 0) {
      return {
        totalCourses: 0,
        averageRelevance: 0,
        scoreDistribution: [
          { relevanceScore: 0, count: 0, percentage: 0 },
          { relevanceScore: 1, count: 0, percentage: 0 },
          { relevanceScore: 2, count: 0, percentage: 0 },
          { relevanceScore: 3, count: 0, percentage: 0 },
        ],
        highlyRelevantCount: 0,
        highlyRelevantRate: 0,
        irrelevantCount: 0,
        irrelevantRate: 0,
      };
    }

    // Calculate average relevance score
    const totalRelevance = evaluations.reduce(
      (sum, item) => sum + item.relevanceScore,
      0,
    );
    const averageRelevance = totalRelevance / total;

    // Calculate score distribution
    const scoreDistribution = this.calculateDistribution(
      evaluations.map((e) => e.relevanceScore),
      total,
    );

    // Count highly relevant courses (score 3)
    const highlyRelevantCount = evaluations.filter(
      (e) => e.relevanceScore === 3,
    ).length;
    const highlyRelevantRate = (highlyRelevantCount / total) * 100;

    // Count irrelevant courses (score 0)
    const irrelevantCount = evaluations.filter(
      (e) => e.relevanceScore === 0,
    ).length;
    const irrelevantRate = (irrelevantCount / total) * 100;

    return {
      totalCourses: total,
      averageRelevance,
      scoreDistribution,
      highlyRelevantCount,
      highlyRelevantRate,
      irrelevantCount,
      irrelevantRate,
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
    // Initialize distribution for all possible scores (0-3)
    const distribution = new Map<number, number>();
    for (let i = 0; i <= 3; i++) {
      distribution.set(i, 0);
    }

    // Count occurrences of each score
    for (const score of scores) {
      distribution.set(score, (distribution.get(score) || 0) + 1);
    }

    // Convert to array format with percentages
    return Array.from(distribution.entries()).map(([score, count]) => ({
      relevanceScore: score as 0 | 1 | 2 | 3,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
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
