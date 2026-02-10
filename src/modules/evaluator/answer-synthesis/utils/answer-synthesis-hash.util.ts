import { EvaluationHashUtil } from '../../shared/utils/evaluation-hash.util';

export type AnswerSynthesisHashParams = {
  queryLogId: string;
};

/**
 * Utility for generating answer synthesis evaluation hashes.
 *
 * This utility encapsulates the hashing strategy used to uniquely identify
 * a question's evaluation for caching and progress tracking.
 *
 * Unlike course filter (which hashes per course), answer synthesis hashes
 * per question since each question has one answer to evaluate.
 *
 * @deprecated Use EvaluationHashUtil directly.
 * This class is kept for backward compatibility.
 */
export class AnswerSynthesisHashUtil {
  /**
   * Generate a unique hash for a question's answer synthesis evaluation.
   *
   * Hash key: SHA256(queryLogId)
   *
   * Only queryLogId is included because:
   * - Each queryLogId represents one question-answer pair
   * - The same queryLogId will always have the same answer
   * - Simpler than course filter (no per-item deduplication needed)
   *
   * @deprecated Use EvaluationHashUtil.generateAnswerSynthesisProgressHash() or
   *             EvaluationHashUtil.generateAnswerSynthesisRecordHash() instead.
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generate(params: AnswerSynthesisHashParams): string {
    // For answer synthesis, progress hash = record hash (same granularity)
    return EvaluationHashUtil.generateAnswerSynthesisProgressHash(params);
  }
}
