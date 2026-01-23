import { Injectable, Logger } from '@nestjs/common';

import type {
  AggregatedCourseForEval,
  AgreementType,
  CourseComparisonRecord,
  JudgeCourseVerdict,
  JudgeEvaluationResult,
  JudgeVerdict,
  QuestionEvalSample,
  SampleEvaluationRecord,
  SystemAction,
  SystemRelevanceScore,
} from '../types/course-relevance-filter.types';

// ============================================================================
// COURSE COMPARISON SERVICE
// ============================================================================

/**
 * Compares system scores with judge verdicts.
 *
 * Transforms system courses (from test set) and judge results (fresh LLM or progress)
 * into comparison records for metrics calculation.
 *
 * This is a pure function service - no side effects, no state management.
 */
@Injectable()
export class CourseComparisonService {
  private readonly logger = new Logger(CourseComparisonService.name);

  /**
   * Compare a single sample (question + courses) with judge results.
   *
   * @param systemSample - System courses from test set (deduplicated)
   * @param judgeResult - Judge verdicts (from LLM or progress file)
   * @returns Comparison record with agreement analysis
   * @throws Error if judge verdict is missing for any course (should not happen)
   */
  compareSample(
    systemSample: QuestionEvalSample,
    judgeResult: JudgeEvaluationResult,
  ): SampleEvaluationRecord {
    const { queryLogId, question, courses: systemCourses } = systemSample;

    this.logger.debug(
      `Comparing sample ${queryLogId}: ${systemCourses.length} system courses vs ${judgeResult.courses.length} judge verdicts`,
    );

    // Create map of judge verdicts by course code for efficient lookup
    const judgeVerdictsByCode = new Map<string, JudgeCourseVerdict>(
      judgeResult.courses.map((v) => [v.code, v]),
    );

    // Validate: ensure counts match
    if (judgeResult.courses.length !== systemCourses.length) {
      this.logger.error(
        `CRITICAL: Course count mismatch in sample ${queryLogId}. System has ${systemCourses.length} courses, but judge has ${judgeResult.courses.length} verdicts. This indicates a bug in judge evaluator or progress merge logic.`,
      );
    }

    // Compare each system course with corresponding judge verdict
    const comparisonRecords: CourseComparisonRecord[] = systemCourses.map(
      (systemCourse) => {
        const judgeVerdict = judgeVerdictsByCode.get(systemCourse.subjectCode);

        if (!judgeVerdict) {
          // This should NEVER happen - indicates a bug
          this.logger.error(
            `CRITICAL: No judge verdict found for course ${systemCourse.subjectCode} in sample ${queryLogId}. System courses: [${systemCourses.map((c) => c.subjectCode).join(', ')}], Judge verdicts: [${judgeResult.courses.map((c) => c.code).join(', ')}].`,
          );
          throw new Error(
            `Missing judge verdict for course ${systemCourse.subjectCode} in sample ${queryLogId}. This should not happen and indicates a bug in the evaluation pipeline.`,
          );
        }

        return this.createComparisonRecord(
          systemCourse,
          judgeVerdict,
          question, // Pass question for context
        );
      },
    );

    this.logger.debug(
      `Comparison complete for sample ${queryLogId}: ${comparisonRecords.length} records created`,
    );

    return {
      queryLogId,
      question,
      courses: comparisonRecords,
      tokenUsage: judgeResult.tokenUsage,
    };
  }

  /**
   * Map system score to binary action.
   *
   * Score 0 → DROP (not relevant)
   * Score 1-3 → KEEP (some relevance)
   *
   * @param score - System relevance score (0-3)
   * @returns Binary action (KEEP or DROP)
   */
  mapScoreToAction(score: SystemRelevanceScore): SystemAction {
    return score > 0 ? 'KEEP' : 'DROP';
  }

  /**
   * Determine agreement type between system action and judge verdict.
   *
   * Mapping:
   * - DROP + FAIL → BOTH_DROP (agreement)
   * - KEEP + PASS → BOTH_KEEP (agreement)
   * - DROP + PASS → CONSERVATIVE_DROP (system too strict)
   * - KEEP + FAIL → EXPLORATORY_DELTA (system too exploratory)
   *
   * @param systemAction - System's binary action
   * @param judgeVerdict - Judge's binary verdict
   * @returns Agreement type
   */
  determineAgreementType(
    systemAction: SystemAction,
    judgeVerdict: JudgeVerdict,
  ): AgreementType {
    if (systemAction === 'DROP' && judgeVerdict === 'FAIL') {
      return 'BOTH_DROP';
    }
    if (systemAction === 'KEEP' && judgeVerdict === 'PASS') {
      return 'BOTH_KEEP';
    }
    if (systemAction === 'DROP' && judgeVerdict === 'PASS') {
      return 'CONSERVATIVE_DROP';
    }
    // systemAction === 'KEEP' && judgeVerdict === 'FAIL'
    return 'EXPLORATORY_DELTA';
  }

  /**
   * Create a comparison record for a single course.
   *
   * @param systemCourse - Aggregated course from test set
   * @param judgeVerdict - Judge's verdict for this course
   * @param question - User's original question (for context in disagreement analysis)
   * @returns Comparison record with agreement analysis
   */
  private createComparisonRecord(
    systemCourse: AggregatedCourseForEval,
    judgeVerdict: JudgeCourseVerdict,
    question: string,
  ): CourseComparisonRecord {
    // Map system score to action (in case it's not already set)
    const systemAction =
      systemCourse.systemAction ??
      this.mapScoreToAction(systemCourse.systemScore);

    // Determine agreement type
    const agreementType = this.determineAgreementType(
      systemAction,
      judgeVerdict.verdict,
    );

    // Agreement is true if both drop or both keep
    const agreement =
      agreementType === 'BOTH_DROP' || agreementType === 'BOTH_KEEP';

    // Extract learning outcomes as string array
    const outcomes = systemCourse.allLearningOutcomes.map((lo) => lo.name);

    return {
      question, // Include question for context
      subjectCode: systemCourse.subjectCode,
      subjectName: systemCourse.subjectName,
      outcomes,
      matchedSkills: systemCourse.matchedSkills,
      system: {
        score: systemCourse.systemScore,
        action: systemAction,
        reason:
          systemCourse.systemReason ??
          `Score ${systemCourse.systemScore} - ${systemAction}`,
      },
      judge: {
        verdict: judgeVerdict.verdict,
        reason: judgeVerdict.reason,
      },
      agreement,
      agreementType,
    };
  }
}
