import { LlmCourseEvaluationItem } from '../schemas/schema';
import {
  EvaluationItem,
  RetrievalPerformanceReport,
} from '../types/course-retrieval.types';
import { DistributionCalculator } from './distribution-calculator';

/**
 * Metrics Calculator
 *
 * Calculates retrieval performance metrics from evaluation items.
 * Focuses on core metrics: averages, distributions, alignment gaps, and mismatches.
 */
export class MetricsCalculator {
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
      courseCode: evalItem.course_code,
      courseName: evalItem.course_name,
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
    const skillRelevanceDistribution =
      DistributionCalculator.calculateDistribution(
        evaluations.map((e) => e.skillRelevance),
        total,
      );
    const contextAlignmentDistribution =
      DistributionCalculator.calculateDistribution(
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
}
