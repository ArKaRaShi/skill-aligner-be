// ============================================================================
// EVALUATION HASH UTILITIES
// ============================================================================
import { HashHelper } from 'src/shared/utils/hash.helper';

/**
 * Shared utility for generating hashes in evaluation modules.
 *
 * This utility provides TWO DISTINCT TYPES of hashes:
 *
 * 1. **Progress Hashes**: Fine-grained tracking for crash recovery
 *    - Track individual items (courses, skills) within a sample
 *    - Enable skipping already-evaluated items on resume
 *    - Example: "course ABC already evaluated, skip it"
 *
 * 2. **Record Hashes**: Sample-level file naming for result storage
 *    - Identify complete evaluation records for storage
 *    - One hash per sample (question or question+skill)
 *    - Example: "records/iteration-1/{hash}.json"
 *
 * **IMPORTANT**: Progress hashes ≠ Record hashes
 * - Progress hashes are MORE FINE-GRAINED (per item)
 * - Record hashes are LESS FINE-GRAINED (per sample)
 * - They serve DIFFERENT PURPOSES and should NOT be confused
 *
 * @example
 * // Progress tracking (skip individual courses)
 * const progressHash = EvaluationHashUtil.generateCourseFilterProgressHash({
 *   queryLogId: '123',
 *   question: 'What is Python?',
 *   subjectCode: 'CS101',
 * });
 *
 * // Record saving (store complete question result)
 * const recordHash = EvaluationHashUtil.generateCourseFilterRecordHash({
 *   queryLogId: '123',
 *   question: 'What is Python?',
 * });
 */
export class EvaluationHashUtil {
  // ==========================================================================
  // PROGRESS TRACKING HASHES (Fine-Grained)
  // ==========================================================================

  /**
   * Generate progress hash for course filter evaluation
   *
   * Tracks individual COURSES within a question.
   * Used to skip already-evaluated courses on resume.
   *
   * Hash: SHA256(queryLogId + "|" + question + "|" + subjectCode)
   *
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generateCourseFilterProgressHash(params: {
    queryLogId: string;
    question: string;
    subjectCode: string;
  }): string {
    const { queryLogId, question, subjectCode } = params;
    const data = `${queryLogId}|${question}|${subjectCode}`;
    return HashHelper.generateHashSHA256(data);
  }

  /**
   * Generate progress hash for skill expansion evaluation
   *
   * Tracks individual SKILLS within a question.
   * Used to skip already-evaluated skills on resume.
   *
   * Hash: SHA256(queryLogId + "|" + question + "|" + skill)
   *
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generateSkillExpansionProgressHash(params: {
    queryLogId: string;
    question: string;
    skill: string;
  }): string {
    const { queryLogId, question, skill } = params;
    const data = `${queryLogId}|${question}|${skill}`;
    return HashHelper.generateHashSHA256(data);
  }

  /**
   * Generate progress hash for answer synthesis evaluation
   *
   * Tracks individual QUESTIONS.
   * Used to skip already-evaluated questions on resume.
   *
   * Hash: SHA256(queryLogId)
   *
   * Note: For answer synthesis, progress hash = record hash
   * (same granularity because one question = one evaluation)
   *
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generateAnswerSynthesisProgressHash(params: {
    queryLogId: string;
  }): string {
    const { queryLogId } = params;
    return HashHelper.generateHashSHA256(queryLogId);
  }

  /**
   * Generate progress hash for course retrieval evaluation
   *
   * Tracks individual (question + skill) SAMPLES.
   * Used to skip already-evaluated samples on resume.
   *
   * Hash: SHA256(question + "|" + skill + "|" + testCaseId?)
   *
   * Note: For course retrieval, progress hash = record hash
   * (same granularity because one sample = one evaluation)
   *
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generateCourseRetrievalProgressHash(params: {
    question: string;
    skill: string;
    testCaseId?: string;
  }): string {
    const { question, skill, testCaseId } = params;
    const testCaseIdPart = testCaseId ? `|${testCaseId}` : '';
    const data = `${question}|${skill}${testCaseIdPart}`;
    return HashHelper.generateHashSHA256(data);
  }

  // ==========================================================================
  // RECORD SAVING HASHES (Sample-Level)
  // ==========================================================================

  /**
   * Generate record hash for course filter evaluation
   *
   * Identifies complete QUESTION evaluation records (all courses together).
   * Used for naming record files: records/iteration-1/{hash}.json
   *
   * Hash: SHA256(queryLogId + "|" + question)
   *
   * Note: LESS FINE-GRAINED than progress hash
   * - Progress: per-course (queryLogId + question + subjectCode)
   * - Record: per-question (queryLogId + question)
   *
   * The judge evaluates all courses for a question in a single batch,
   * so one record is saved per question containing all course evaluations.
   *
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generateCourseFilterRecordHash(params: {
    queryLogId: string;
    question: string;
  }): string {
    const { queryLogId, question } = params;
    const data = `${queryLogId}|${question}`;
    return HashHelper.generateHashSHA256(data);
  }

  /**
   * Generate record hash for skill expansion evaluation
   *
   * Identifies complete QUESTION records (all skills together).
   * Used for naming record files: records/iteration-1/{hash}.json
   *
   * Hash: SHA256(queryLogId + "|" + question)
   *
   * Note: LESS FINE-GRAINED than progress hash
   * - Progress: per-skill (queryLogId + question + skill)
   * - Record: per-question (queryLogId + question)
   *
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generateSkillExpansionRecordHash(params: {
    queryLogId: string;
    question: string;
  }): string {
    const { queryLogId, question } = params;
    const data = `${queryLogId}|${question}`;
    return HashHelper.generateHashSHA256(data);
  }

  /**
   * Generate record hash for answer synthesis evaluation
   *
   * Identifies complete QUESTION records.
   * Used for naming record files: records/iteration-1/{hash}.json
   *
   * Hash: SHA256(queryLogId)
   *
   * Note: SAME granularity as progress hash
   * - Progress: per-question (queryLogId)
   * - Record: per-question (queryLogId)
   *
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generateAnswerSynthesisRecordHash(params: {
    queryLogId: string;
  }): string {
    const { queryLogId } = params;
    return HashHelper.generateHashSHA256(queryLogId);
  }

  /**
   * Generate record hash for course retrieval evaluation
   *
   * Identifies complete (question + skill) SAMPLE records.
   * Used for naming record files: records/iteration-1/{hash}.json
   *
   * Hash: SHA256(question + "|" + skill + "|" + testCaseId?)
   *
   * Note: SAME granularity as progress hash
   * - Progress: per-sample (question + skill + testCaseId?)
   * - Record: per-sample (question + skill + testCaseId?)
   *
   * @param params - Hash parameters
   * @returns SHA256 hash hex string
   */
  static generateCourseRetrievalRecordHash(params: {
    question: string;
    skill: string;
    testCaseId?: string;
  }): string {
    const { question, skill, testCaseId } = params;
    const testCaseIdPart = testCaseId ? `|${testCaseId}` : '';
    const data = `${question}|${skill}${testCaseIdPart}`;
    return HashHelper.generateHashSHA256(data);
  }
}
