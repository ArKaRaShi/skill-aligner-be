import { z } from 'zod';

// ============================================================================
// JUDGE VERDICT SCHEMA (Binary)
// ============================================================================

/**
 * Judge's binary verdict
 * - FAIL: Course should be excluded (noise)
 * - PASS: Course should be included (relevant/serendipitous)
 */
export const JudgeVerdictSchema = z.enum(['PASS', 'FAIL']);

export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

// ============================================================================
// JUDGE OUTPUT SCHEMA (from LLM)
// ============================================================================

/**
 * Judge's verdict for a single course
 */
export const JudgeCourseVerdictSchema = z.object({
  code: z.string().min(1, 'Course code is required'),
  verdict: JudgeVerdictSchema,
  reason: z.string().min(1, 'Reason is required'),
});

/**
 * Judge's complete evaluation result (from LLM)
 *
 * This is the raw output from the LLM judge after evaluating courses.
 * Used for schema validation and type inference.
 */
export const JudgeEvaluationResultSchema = z.object({
  courses: z
    .array(JudgeCourseVerdictSchema)
    .min(1, 'At least one verdict required'),
});

/**
 * Dynamic judge evaluation result schema
 *
 * Allows specifying min/max course counts for validation.
 *
 * @param minItems - Minimum number of course verdicts
 * @param maxItems - Maximum number of course verdicts
 * @returns Zod schema for judge evaluation result
 */
export function getJudgeEvaluationResultSchema(
  minItems: number,
  maxItems: number,
) {
  return z.object({
    courses: z
      .array(JudgeCourseVerdictSchema)
      .min(minItems, `At least ${minItems} course(s) required`)
      .max(maxItems, `At most ${maxItems} courses allowed`),
  });
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Single course verdict from LLM judge
 */
export type LlmJudgeCourseVerdict = z.infer<typeof JudgeCourseVerdictSchema>;

/**
 * Complete judge evaluation result from LLM
 */
export type LlmJudgeEvaluationResult = z.infer<
  typeof JudgeEvaluationResultSchema
>;
