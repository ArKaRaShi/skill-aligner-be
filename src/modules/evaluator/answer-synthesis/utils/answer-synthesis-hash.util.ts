import { HashHelper } from 'src/shared/utils/hash.helper';

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
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generate(params: AnswerSynthesisHashParams): string {
    const { queryLogId } = params;
    return HashHelper.generateHashSHA256(queryLogId);
  }
}
