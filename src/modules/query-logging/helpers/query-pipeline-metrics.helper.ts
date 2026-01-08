import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';

import { TokenCostCalculator } from '../../../shared/utils/token-cost-calculator.helper';
import type {
  AggregatedCourseSkills,
  CourseWithLearningOutcomeV2MatchWithRelevance,
} from '../../query-processor/types/course-aggregation.type';
import type {
  CourseAggregationStepOutput,
  CourseFilterStepOutput,
} from '../types/query-log-step.type';

/**
 * Static helper class for calculating query pipeline logging metrics.
 *
 * Moved from query-processor to query-logging module to encapsulate all
 * logging-related metric calculations in the logging layer.
 *
 * All methods are static - no instantiation needed.
 *
 * @example
 * ```ts
 * import { QueryPipelineMetrics } from '../helpers/query-pipeline-metrics.helper';
 *
 * const filterOutput = QueryPipelineMetrics.calculateSkillFilterMetrics(skill, filterResult);
 * const aggOutput = QueryPipelineMetrics.calculateAggregationMetrics(map, courses);
 * ```
 */
export class QueryPipelineMetrics {
  /**
   * Calculate total embedding cost from EmbeddingUsage.
   * Sums cost across all skills that were embedded.
   */
  static calculateEmbeddingCost(embeddingUsage: {
    bySkill: Array<{ promptTokens: number; model: string }>;
  }): number {
    return embeddingUsage.bySkill.reduce((total, skillUsage) => {
      const costEstimate = TokenCostCalculator.estimateCost({
        inputTokens: skillUsage.promptTokens,
        outputTokens: 0, // Embeddings have no output tokens
        model: skillUsage.model,
      });
      return total + costEstimate.estimatedCost;
    }, 0);
  }

  /**
   * Count unique courses from skillCoursesMap.
   * Same course may appear under multiple skills - deduplicates by subjectCode.
   */
  static countCourses(
    skillCoursesMap: Map<string, CourseWithLearningOutcomeV2Match[]>,
  ): number {
    const uniqueCourseCodes = new Set<string>();
    for (const courses of skillCoursesMap.values()) {
      for (const course of courses) {
        uniqueCourseCodes.add(course.subjectCode);
      }
    }
    return uniqueCourseCodes.size;
  }

  /**
   * Calculate detailed filter metrics for a single skill.
   * Returns accepted/rejected/missing courses with LLM reasons and matched learning outcomes.
   */
  static calculateSkillFilterMetrics(
    skill: string,
    filterResult: {
      llmAcceptedCoursesBySkill: Map<
        string,
        CourseWithLearningOutcomeV2MatchWithRelevance[]
      >;
      llmRejectedCoursesBySkill: Map<
        string,
        CourseWithLearningOutcomeV2MatchWithRelevance[]
      >;
      llmMissingCoursesBySkill: Map<
        string,
        CourseWithLearningOutcomeV2MatchWithRelevance[]
      >;
    },
  ): CourseFilterStepOutput {
    const acceptedCourses =
      filterResult.llmAcceptedCoursesBySkill.get(skill) ?? [];
    const rejectedCourses =
      filterResult.llmRejectedCoursesBySkill.get(skill) ?? [];
    const missingCourses =
      filterResult.llmMissingCoursesBySkill.get(skill) ?? [];

    // Build accepted courses with full detail
    const acceptedOutputCourses = acceptedCourses.map((course) => ({
      courseCode: course.subjectCode,
      courseName: course.subjectName,
      score: course.score,
      reason: course.reason ?? 'No reason provided',
      matchedLos: course.matchedLearningOutcomes.map((lo) => ({
        id: lo.loId,
        name: lo.cleanedName,
      })),
    }));

    // Build rejected courses with full detail
    const rejectedOutputCourses = rejectedCourses.map((course) => ({
      courseCode: course.subjectCode,
      courseName: course.subjectName,
      score: course.score,
      reason: course.reason ?? 'No reason provided',
      matchedLos: course.matchedLearningOutcomes.map((lo) => ({
        id: lo.loId,
        name: lo.cleanedName,
      })),
    }));

    // Build missing courses with full detail
    const missingOutputCourses = missingCourses.map((course) => ({
      courseCode: course.subjectCode,
      courseName: course.subjectName,
      score: course.score,
      reason: course.reason ?? 'Not found in LLM response',
      matchedLos: course.matchedLearningOutcomes.map((lo) => ({
        id: lo.loId,
        name: lo.cleanedName,
      })),
    }));

    // Calculate counts
    const inputCount =
      acceptedCourses.length + rejectedCourses.length + missingCourses.length;
    const acceptedCount = acceptedCourses.length;
    const rejectedCount = rejectedCourses.length;
    const missingCount = missingCourses.length;

    // Calculate score distribution (from accepted courses only)
    const scoreDistribution = { score1: 0, score2: 0, score3: 0 };
    for (const course of acceptedCourses) {
      const scoreKey = `score${course.score}` as keyof typeof scoreDistribution;
      if (scoreKey in scoreDistribution) {
        scoreDistribution[scoreKey]++;
      }
    }

    // Calculate semantic metrics
    const llmDecisionCount = acceptedCount + rejectedCount;
    const llmDecisionRate = inputCount > 0 ? llmDecisionCount / inputCount : 0;
    const llmRejectionRate =
      llmDecisionCount > 0 ? rejectedCount / llmDecisionCount : 0;
    const llmFallbackRate = inputCount > 0 ? missingCount / inputCount : 0;

    return {
      skill,
      inputCount,
      acceptedCourses: acceptedOutputCourses,
      rejectedCourses: rejectedOutputCourses,
      missingCourses: missingOutputCourses,
      acceptedCount,
      rejectedCount,
      missingCount,
      llmDecisionRate,
      llmRejectionRate,
      llmFallbackRate,
      scoreDistribution,
      avgScore:
        acceptedCourses.length > 0
          ? acceptedCourses.reduce((sum, c) => sum + c.score, 0) /
            acceptedCourses.length
          : undefined,
    };
  }

  /**
   * Calculate detailed aggregation metrics across all skills.
   * Returns per-course skill breakdowns with tie handling for winning skills.
   */
  static calculateAggregationMetrics(
    filteredSkillCoursesMap: Map<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >,
    aggregatedCourseSkills: AggregatedCourseSkills[],
  ): CourseAggregationStepOutput {
    // Build course -> skills mapping
    const courseToSkills = new Map<
      string,
      Array<{
        skill: string;
        score: number;
        matchedLoCount: number;
        matchingLos: Array<{ id: string; name: string }>;
      }>
    >();

    for (const [skill, skillCourses] of filteredSkillCoursesMap.entries()) {
      for (const course of skillCourses) {
        const key = course.subjectCode;
        if (!courseToSkills.has(key)) {
          courseToSkills.set(key, []);
        }
        courseToSkills.get(key)!.push({
          skill,
          score: course.score,
          matchedLoCount: course.matchedLearningOutcomes.length,
          matchingLos: course.matchedLearningOutcomes.map((lo) => ({
            id: lo.loId,
            name: lo.cleanedName,
          })),
        });
      }
    }

    // Build courses with skill breakdowns
    const courses = aggregatedCourseSkills.map((aggCourse) => {
      const skillBreakdown = courseToSkills.get(aggCourse.subjectCode) ?? [];
      const maxScore =
        skillBreakdown.length > 0
          ? Math.max(...skillBreakdown.map((s) => s.score))
          : 0;

      return {
        courseId: aggCourse.id,
        courseCode: aggCourse.subjectCode,
        courseName: aggCourse.subjectName,
        skillBreakdown,
        finalScore: aggCourse.relevanceScore,
        winningSkills: skillBreakdown
          .filter((s) => s.score === maxScore)
          .map((s) => s.skill),
        otherSkills: skillBreakdown
          .filter((s) => s.score < maxScore)
          .map((s) => s.skill),
        skillCount: skillBreakdown.length,
      };
    });

    // Calculate aggregate stats
    const rawCourseCount = Array.from(filteredSkillCoursesMap.values()).reduce(
      (sum, courseList) => sum + courseList.length,
      0,
    );
    const uniqueCourseCount = courses.length;
    const duplicateCount = rawCourseCount - uniqueCourseCount;

    // Calculate score distribution
    const scoreDistribution = { score1: 0, score2: 0, score3: 0 };
    for (const course of courses) {
      const scoreKey =
        `score${course.finalScore}` as keyof typeof scoreDistribution;
      if (scoreKey in scoreDistribution) {
        scoreDistribution[scoreKey]++;
      }
    }

    const contributingSkills = Array.from(filteredSkillCoursesMap.keys());

    return {
      rawCourseCount,
      uniqueCourseCount,
      duplicateCount,
      duplicateRate:
        rawCourseCount > 0 ? (duplicateCount / rawCourseCount) * 100 : 0,
      courses,
      scoreDistribution,
      contributingSkills,
    };
  }
}
