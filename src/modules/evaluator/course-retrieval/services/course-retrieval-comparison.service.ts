import { Injectable, Logger } from '@nestjs/common';

import type {
  CourseRetrievalAgreementType,
  CourseRetrievalComparisonRecord,
  CourseRetrievalJudgeResult,
  CourseRetrievalSampleComparisonRecord,
  CourseRetrievalSystemSample,
} from '../types/course-retrieval.types';

/**
 * Compares system retrieval results with judge verdicts.
 *
 * Transforms system courses (from test set) and judge results (fresh LLM or progress)
 * into comparison records for metrics calculation.
 *
 * This is a pure function service - no side effects, no state management.
 * Updated for single-score evaluation model (commit e9cfa11).
 */
@Injectable()
export class CourseRetrievalComparisonService {
  private readonly logger = new Logger(CourseRetrievalComparisonService.name);

  /**
   * Compare a single sample (question + skill + courses) with judge results.
   *
   * @param systemSample - System courses from test set
   * @param systemScore - System's relevance score for this sample (0-3)
   * @param judgeResult - Judge verdicts (from LLM or progress file)
   * @returns Comparison record with agreement analysis
   * @throws Error if judge verdict is missing for any course (should not happen)
   */
  compareSample(
    systemSample: CourseRetrievalSystemSample,
    systemScore: number,
    judgeResult: CourseRetrievalJudgeResult,
  ): CourseRetrievalSampleComparisonRecord {
    const {
      question,
      skill,
      testCaseId,
      retrievedCourses: systemCourses,
    } = systemSample;

    this.logger.debug(
      `Comparing sample "${skill}" for "${question}": ${systemCourses.length} system courses vs ${judgeResult.courses.length} judge verdicts`,
    );

    // Create map of judge verdicts by course code for efficient lookup
    const judgeVerdictsByCode = new Map(
      judgeResult.courses.map((v) => [v.subjectCode, v]),
    );

    // Validate: ensure counts match
    if (judgeResult.courses.length !== systemCourses.length) {
      this.logger.error(
        `CRITICAL: Course count mismatch in sample ${skill}. System has ${systemCourses.length} courses, but judge has ${judgeResult.courses.length} verdicts. This indicates a bug in judge evaluator or progress merge logic.`,
      );
    }

    // Compare each system course with corresponding judge verdict
    const comparisonRecords: CourseRetrievalComparisonRecord[] =
      systemCourses.map((systemCourse) => {
        const judgeVerdict = judgeVerdictsByCode.get(systemCourse.subjectCode);

        if (!judgeVerdict) {
          // This should NEVER happen - indicates a bug
          this.logger.error(
            `CRITICAL: No judge verdict found for course ${systemCourse.subjectCode} in sample ${skill}. System courses: [${systemCourses.map((c) => c.subjectCode).join(', ')}], Judge verdicts: [${judgeResult.courses.map((c) => c.subjectCode).join(', ')}].`,
          );
          throw new Error(
            `Missing judge verdict for course ${systemCourse.subjectCode} in sample ${skill}. This should not happen and indicates a bug in the evaluation pipeline.`,
          );
        }

        return this.createComparisonRecord(
          question,
          skill,
          systemCourse,
          systemScore,
          judgeVerdict,
        );
      });

    this.logger.debug(
      `Comparison complete for sample "${skill}": ${comparisonRecords.length} records created`,
    );

    return {
      question,
      skill,
      testCaseId,
      courses: comparisonRecords,
      tokenUsage: judgeResult.tokenUsage,
    };
  }

  /**
   * Map system relevance score to relevance category.
   *
   * Score ≥ 2 → RELEVANT (high relevance)
   * Score < 2 → NOT_RELEVANT (low relevance)
   *
   * @param relevanceScore - System's relevance score (0-3)
   * @returns Relevance category
   */
  mapScoreToRelevance(relevanceScore: number): 'RELEVANT' | 'NOT_RELEVANT' {
    return relevanceScore >= 2 ? 'RELEVANT' : 'NOT_RELEVANT';
  }

  /**
   * Determine agreement type between system relevance and judge verdict.
   *
   * Mapping:
   * - RELEVANT + RELEVANT → BOTH_RELEVANT (agreement)
   * - NOT_RELEVANT + NOT_RELEVANT → BOTH_NOT_RELEVANT (agreement)
   * - RELEVANT + NOT_RELEVANT → SYSTEM_EXPLORATORY (system too exploratory)
   * - NOT_RELEVANT + RELEVANT → SYSTEM_CONSERVATIVE (system too conservative)
   * - PARTIALLY_RELEVANT → PARTIAL_MISMATCH
   *
   * @param systemRelevance - System's relevance category
   * @param judgeVerdict - Judge's verdict
   * @returns Agreement type
   */
  determineAgreementType(
    systemRelevance: 'RELEVANT' | 'NOT_RELEVANT',
    judgeVerdict: 'RELEVANT' | 'NOT_RELEVANT' | 'PARTIALLY_RELEVANT',
  ): CourseRetrievalAgreementType {
    if (judgeVerdict === 'PARTIALLY_RELEVANT') {
      return 'PARTIAL_MISMATCH';
    }

    if (systemRelevance === 'NOT_RELEVANT' && judgeVerdict === 'NOT_RELEVANT') {
      return 'BOTH_NOT_RELEVANT';
    }
    if (systemRelevance === 'RELEVANT' && judgeVerdict === 'RELEVANT') {
      return 'BOTH_RELEVANT';
    }
    if (systemRelevance === 'NOT_RELEVANT' && judgeVerdict === 'RELEVANT') {
      return 'SYSTEM_CONSERVATIVE';
    }
    // systemRelevance === 'RELEVANT' && judgeVerdict === 'NOT_RELEVANT'
    return 'SYSTEM_EXPLORATORY';
  }

  /**
   * Create a comparison record for a single course.
   *
   * @param question - User's question (for context)
   * @param skill - The skill being evaluated
   * @param systemCourse - Course from system retrieval
   * @param systemScore - System's relevance score for this sample
   * @param judgeVerdict - Judge's verdict for this course
   * @returns Comparison record with agreement analysis
   */
  private createComparisonRecord(
    question: string,
    skill: string,
    systemCourse: {
      subjectCode: string;
      subjectName: string;
      cleanedLearningOutcomes: string[];
    },
    systemScore: number,
    judgeVerdict: {
      subjectCode: string;
      verdict: 'RELEVANT' | 'NOT_RELEVANT' | 'PARTIALLY_RELEVANT';
      reason: string;
    },
  ): CourseRetrievalComparisonRecord {
    // Map system score to relevance category
    const systemRelevance = this.mapScoreToRelevance(systemScore);

    // Determine agreement type
    const agreementType = this.determineAgreementType(
      systemRelevance,
      judgeVerdict.verdict,
    );

    // Agreement is true for exact matches on relevance
    const agreement =
      agreementType === 'BOTH_RELEVANT' ||
      agreementType === 'BOTH_NOT_RELEVANT';

    return {
      question,
      skill,
      subjectCode: systemCourse.subjectCode,
      subjectName: systemCourse.subjectName,
      system: {
        relevanceScore: systemScore,
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
