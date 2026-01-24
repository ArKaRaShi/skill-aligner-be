import { HashHelper } from 'src/shared/utils/hash.helper';

import type { CourseRetrievalHashParams } from '../types/course-retrieval.types';

/**
 * Utility for generating course-retrieval-specific hashes for evaluation caching.
 *
 * This utility encapsulates the hashing strategy used to uniquely identify
 * a question+skill combination. The same combination will always produce
 * the same hash, enabling caching and deduplication of LLM evaluations.
 *
 * Hash key format: SHA256(question + "|" + skill + "|" + testCaseId?)
 *
 * All parameters are included to ensure:
 * - Same skill in different questions gets different hashes
 * - Same question with different skills gets different hashes
 * - testCaseId is included for grouping within a test case
 * - Case-sensitive matching (Python ≠ python)
 */
export class CourseRetrievalHashUtil {
  /**
   * Generate a unique hash for a question+skill combination.
   *
   * @param params - Hash parameters
   * @returns SHA256 hash hex string (64 characters)
   *
   * @example
   * ```ts
   * const hash = CourseRetrievalHashUtil.generate({
   *   question: 'How to learn Python?',
   *   skill: 'Python programming',
   *   testCaseId: 'test-001'
   * });
   * // Returns: "a1b2c3d4..." (64 character hex string)
   * ```
   */
  static generate(params: CourseRetrievalHashParams): string {
    const { question, skill, testCaseId } = params;

    // Use pipe delimiter to avoid collisions (e.g., "a|bc" vs "ab|c")
    // testCaseId is optional, so we handle it conditionally
    const data = testCaseId
      ? `${question}|${skill}|${testCaseId}`
      : `${question}|${skill}`;

    return HashHelper.generateHashSHA256(data);
  }

  /**
   * Generate a hash for a course in a specific question+skill context.
   *
   * This variant includes courseId for course-level tracking.
   *
   * @param params - Hash parameters with courseId
   * @returns SHA256 hash hex string (64 characters)
   */
  static generateForCourse(
    params: CourseRetrievalHashParams & {
      courseId: string;
    },
  ): string {
    const { question, skill, testCaseId, courseId } = params;

    // Order: question, skill, courseId, testCaseId
    // testCaseId is optional
    const data = testCaseId
      ? `${question}|${skill}|${courseId}|${testCaseId}`
      : `${question}|${skill}|${courseId}`;

    return HashHelper.generateHashSHA256(data);
  }

  /**
   * Validate if a hash string is a valid SHA256 hash.
   *
   * @param hash - Hash string to validate
   * @returns true if valid SHA256 hash (64 hex characters)
   */
  static isValidHash(hash: string): boolean {
    return /^[a-f0-9]{64}$/i.test(hash);
  }
}
