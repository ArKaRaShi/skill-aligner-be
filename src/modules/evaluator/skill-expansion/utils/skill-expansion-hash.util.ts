import { HashHelper } from '../../../../shared/utils/hash.helper';

/**
 * Utility class for generating hashes in skill expansion evaluation
 *
 * Hashes are used for progress tracking and deduplication.
 * The hash is generated from immutable identifiers only.
 */
export class SkillExpansionHashUtil {
  /**
   * Generate a unique hash for a skill evaluation entry
   *
   * The hash is based on immutable identifiers:
   * - queryLogId: Unique identifier for the query log entry
   * - question: The original user question
   * - skill: The skill text being evaluated
   *
   * These values should never change for a given evaluation entry,
   * ensuring the hash remains stable across evaluation runs.
   *
   * @param params - Parameters for hash generation
   * @returns SHA256 hash as a hexadecimal string
   */
  static generate(params: {
    queryLogId: string;
    question: string;
    skill: string;
  }): string {
    const { queryLogId, question, skill } = params;

    // Create a pipe-delimited string for hashing
    const data = `${queryLogId}|${question}|${skill}`;

    return HashHelper.generateHashSHA256(data);
  }

  /**
   * Generate a hash for a complete question sample
   *
   * This is useful for tracking overall question-level progress.
   *
   * @param params - Parameters for hash generation
   * @returns SHA256 hash as a hexadecimal string
   */
  static generateQuestionHash(params: {
    queryLogId: string;
    question: string;
  }): string {
    const { queryLogId, question } = params;
    const data = `${queryLogId}|${question}`;

    return HashHelper.generateHashSHA256(data);
  }

  /**
   * Generate a hash for a test set
   *
   * Useful for identifying test sets uniquely.
   *
   * @param testSetName - Name of the test set
   * @returns SHA256 hash as a hexadecimal string
   */
  static generateTestSetHash(testSetName: string): string {
    return HashHelper.generateHashSHA256(testSetName);
  }
}
