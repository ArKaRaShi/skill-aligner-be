import { z } from 'zod';

// ============================================================================
// SCORE DIMENSION SCHEMA (1-5 scale with reasoning)
// ============================================================================

/**
 * Score dimension with reasoning (1-5 ordinal scale)
 * Used for both faithfulness and completeness evaluation.
 */
export const ScoreDimensionSchema = z.object({
  score: z
    .number()
    .int('Score must be an integer')
    .refine((val) => val >= 1 && val <= 5, {
      message: 'Score must be exactly 1, 2, 3, 4, or 5',
    })
    .describe('Score from 1-5 on the evaluation dimension'),
  reasoning: z
    .string()
    .min(1, 'Reasoning is required')
    .describe('Explanation for the score'),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Score dimension type (used for both faithfulness and completeness)
 */
export type ScoreDimension = z.infer<typeof ScoreDimensionSchema>;

// ============================================================================
// JUDGE VERDICT SCHEMA
// ============================================================================

/**
 * Judge's verdict for answer synthesis evaluation
 *
 * Evaluates TWO dimensions:
 * 1. FAITHFULNESS: Does the answer stick to the provided context?
 * 2. COMPLETENESS: Does the answer explain WHY courses matter to the user?
 */
export const AnswerSynthesisJudgeVerdictSchema = z.object({
  faithfulness: ScoreDimensionSchema,
  completeness: ScoreDimensionSchema,
});

/**
 * Judge's complete verdict for answer synthesis
 */
export type AnswerSynthesisJudgeVerdict = z.infer<
  typeof AnswerSynthesisJudgeVerdictSchema
>;

// ============================================================================
// SCORING GUIDE REFERENCE
// ============================================================================

/**
 * FAITHFULNESS Scoring Guide (1-5 Scale):
 *
 * Score 1: COMPLETELY FALSE
 * - The answer contradicts the context or is entirely hallucinatory
 * - The answer is unrelated to the provided information
 * - Claims are directly opposite to what the context states
 *
 * Score 2: MOSTLY FALSE
 * - The answer contains major factual errors
 * - Significant parts of the answer are not supported by the context
 * - Multiple claims are hallucinated or invented
 *
 * Score 3: MIXED
 * - The answer contains a mix of supported facts and unsupported claims
 * - Some statements are correct, but others are hallucinations or not found in the context
 * - Partial adherence to context with notable deviations
 *
 * Score 4: MOSTLY TRUE
 * - The answer is factually accurate and supported
 * - May miss minor details or nuances from the context, but no false claims
 * - Generally faithful with minor omissions
 *
 * Score 5: PERFECT
 * - The answer is fully supported by the context
 * - Every claim made can be traced back to the source text
 * - No hallucinations or outside knowledge used
 * - Complete adherence to provided information
 */

/**
 * COMPLETENESS Scoring Guide (1-5 Scale):
 *
 * Score 1: FAIL
 * - Just lists course codes/names WITHOUT REASONING
 * - Or states "No relevant courses found" when VALID OPTIONS EXISTED in context
 *
 * Score 2: WEAK
 * - Lists courses with VERY LITTLE context or explanation
 * - Minimal connection to user's query
 *
 * Score 3: DESCRIPTIVE ONLY
 * - Simply LISTS what the courses teach (summarizes context)
 * - FAILS TO EXPLAIN WHY it matters to the user
 * - User has to guess the connection
 *
 * Score 4: GOOD EXPLANATION
 * - Links courses to the query logically
 * - Explanation might be slightly generic
 * - Covers the recommended courses well
 *
 * Score 5: EXCELLENT BRIDGING
 * - EXPLICITLY EXPLAINS WHY the recommended course fits the user's specific query
 * - CONNECTS THE DOTS (e.g., "Course X teaches Python, which is essential for your goal of building AI")
 * - If the match is indirect, provides CLEAR REASONING
 */
