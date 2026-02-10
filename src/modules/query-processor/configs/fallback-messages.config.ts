/**
 * Centralized fallback response messages for the query pipeline.
 *
 * These messages are returned to users when the pipeline cannot complete
 * successfully (e.g., no courses found, irrelevant question, dangerous content).
 *
 * @example
 * Usage in AnswerQuestionUseCase:
 * ```ts
 * import { QueryPipelineFallbackMessages } from '../configs/fallback-messages.config';
 *
 * return {
 *   answer: QueryPipelineFallbackMessages.EMPTY_RESULTS,
 *   suggestQuestion: QueryPipelineFallbackMessages.SUGGEST_EMPTY_RESULTS,
 *   relatedCourses: [],
 * };
 * ```
 */
export const QueryPipelineFallbackMessages = {
  /**
   * Message when no courses are found after retrieval and filtering
   */
  EMPTY_RESULTS: 'ขออภัย เราไม่พบรายวิชาที่เกี่ยวข้องกับคำถามของคุณ',

  /**
   * Suggested question when no courses are found
   */
  SUGGEST_EMPTY_RESULTS: 'อยากเรียนการเงินส่วนบุคคล',

  /**
   * Message when question is classified as irrelevant (out of scope)
   */
  IRRELEVANT_QUESTION: 'ขออภัย คำถามของคุณอยู่นอกขอบเขตที่เราสามารถช่วยได้',

  /**
   * Suggested question when input is irrelevant
   */
  SUGGEST_IRRELEVANT: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',

  /**
   * Message when question is classified as dangerous/inappropriate
   */
  DANGEROUS_QUESTION: 'ขออภัย คำถามของคุณมีเนื้อหาที่ไม่เหมาะสมหรือเป็นอันตราย',

  /**
   * Suggested question when input is dangerous
   */
  SUGGEST_DANGEROUS: 'อยากเรียนเกี่ยวกับการพัฒนาโมเดลภาษา AI',
} as const;

/**
 * Type export for type inference
 */
export type QueryPipelineFallbackMessages =
  typeof QueryPipelineFallbackMessages;
