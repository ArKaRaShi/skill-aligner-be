import { HashHelper } from 'src/shared/utils/hash.helper';

export type CourseHashParams = {
  queryLogId: string;
  question: string;
  subjectCode: string;
};

/**
 * Utility for generating course-specific hashes for evaluation caching.
 *
 * This utility encapsulates the hashing strategy used to uniquely identify
 * a course within a specific question context. The same course+question
 * combination will always produce the same hash, enabling caching and
 * deduplication of LLM evaluations.
 */
export class CourseHashUtil {
  /**
   * Generate a unique hash for a course in a specific question context.
   *
   * Hash key: SHA256(queryLogId + "|" + question + "|" + subjectCode)
   *
   * All three parameters are included to ensure:
   * - Same course in different questions gets different hashes
   * - Same question with different queryLogIds gets different hashes (for tracking)
   * - Case-sensitive matching (Python ≠ python)
   *
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generate(params: CourseHashParams): string {
    const { queryLogId, question, subjectCode } = params;
    // Use pipe delimiter to avoid collisions (e.g., "a|bc" vs "ab|c")
    const data = `${queryLogId}|${question}|${subjectCode}`;
    return HashHelper.generateHashSHA256(data);
  }
}
