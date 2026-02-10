import { Injectable, Logger } from '@nestjs/common';

import type {
  AnswerSynthesisComparisonRecord,
  AnswerSynthesisJudgeResult,
  AnswerSynthesisTestCase,
} from '../types/answer-synthesis.types';

// ============================================================================
// ANSWER SYNTHESIS COMPARISON SERVICE
// ============================================================================

/**
 * Compares system answers with judge verdicts.
 *
 * Transforms test cases and judge results into comparison records
 * for metrics calculation.
 *
 * This is a pure function service - no side effects, no state management.
 *
 * Two-Dimension Evaluation:
 * - FAITHFULNESS (1-5): Does the answer stick to context?
 * - COMPLETENESS (1-5): Does the answer explain WHY courses matter?
 *
 * Pass Criteria: BOTH dimensions ≥ 4
 */
@Injectable()
export class AnswerSynthesisComparisonService {
  private readonly logger = new Logger(AnswerSynthesisComparisonService.name);

  /**
   * Compare a single test case with judge result.
   *
   * @param testCase - Test case with question, context, and system answer
   * @param judgeResult - Judge verdict with token usage
   * @returns Comparison record with overall score and pass status
   */
  compareSample(
    testCase: AnswerSynthesisTestCase,
    judgeResult: AnswerSynthesisJudgeResult,
  ): AnswerSynthesisComparisonRecord {
    const { queryLogId, question, answer, context } = testCase;
    const { verdict, tokenUsage } = judgeResult;

    const QUESTION_PREVIEW_LENGTH = 50;
    this.logger.debug(
      `Comparing sample ${queryLogId}: question="${question.substring(0, QUESTION_PREVIEW_LENGTH)}..."`,
    );

    // Overall score is average of both dimensions
    const overallScore =
      (verdict.faithfulness.score + verdict.completeness.score) / 2;

    // Pass if BOTH dimensions meet threshold (score ≥ 4)
    const passed =
      verdict.faithfulness.score >= 4 && verdict.completeness.score >= 4;

    const record: AnswerSynthesisComparisonRecord = {
      queryLogId,
      question,
      systemAnswer: answer,
      judgeVerdict: verdict,
      overallScore,
      passed,
      courseCount: context.length,
      tokenUsage,
    };

    this.logger.debug(
      `Comparison complete for ${queryLogId}: faithfulness=${verdict.faithfulness.score}, completeness=${verdict.completeness.score}, overall=${overallScore.toFixed(2)}, passed=${passed}`,
    );

    return record;
  }

  /**
   * Compare multiple test cases with judge results.
   *
   * @param testCases - Array of test cases
   * @param judgeResults - Array of judge results (must match testCases length)
   * @returns Array of comparison records
   * @throws Error if lengths don't match
   */
  compareBatch(
    testCases: AnswerSynthesisTestCase[],
    judgeResults: AnswerSynthesisJudgeResult[],
  ): AnswerSynthesisComparisonRecord[] {
    if (testCases.length !== judgeResults.length) {
      throw new Error(
        `Test case count (${testCases.length}) does not match judge result count (${judgeResults.length})`,
      );
    }

    this.logger.log(
      `Comparing ${testCases.length} test cases with judge results...`,
    );

    const records = testCases.map((testCase, index) =>
      this.compareSample(testCase, judgeResults[index]),
    );

    this.logger.log(
      `Batch comparison complete: ${records.length} records created`,
    );

    return records;
  }

  /**
   * Calculate the average score from an array of comparison records.
   *
   * @param records - Comparison records
   * @returns Average overall score (1-5)
   */
  calculateAverageScore(records: AnswerSynthesisComparisonRecord[]): number {
    if (records.length === 0) {
      return 0;
    }

    const totalScore = records.reduce(
      (sum, record) => sum + record.overallScore,
      0,
    );

    return totalScore / records.length;
  }

  /**
   * Calculate the pass rate from an array of comparison records.
   *
   * @param records - Comparison records
   * @returns Pass rate (0-1)
   */
  calculatePassRate(records: AnswerSynthesisComparisonRecord[]): number {
    if (records.length === 0) {
      return 0;
    }

    const passedCount = records.filter((record) => record.passed).length;

    return passedCount / records.length;
  }
}
