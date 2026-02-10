import { z } from 'zod';

// Helper schema for relevance score with type predicate
const RelevanceScoreSchema = z
  .number()
  .int('Score must be an integer')
  .refine((val): val is 0 | 1 | 2 | 3 => val >= 0 && val <= 3, {
    message: 'Score must be exactly 0, 1, 2, or 3',
  });

/**
 * Schema for single course evaluation item
 *
 * Matches the updated prompt format (commit e9cfa11) which uses
 * a single relevance score instead of the two-dimensional model.
 */
export const CourseEvaluationItemSchema = z.object({
  code: z.string().min(1).describe('Course code (e.g., "CS101")'),
  score: RelevanceScoreSchema.describe(
    'Relevance score (0-3): 0=Irrelevant, 1=Marginally, 2=Fairly, 3=Highly',
  ),
  reason: z
    .string()
    .min(1)
    .describe('Brief justification for the assigned score'),
});

/**
 * Schema for Course Retriever Evaluator Result
 *
 * @param minItems - minimum number of evaluation items
 * @param maxItems - maximum number of evaluation items
 * @returns Zod schema object
 */
export function getCourseRetrievalEvaluatorSchema(
  minItems: number,
  maxItems: number,
) {
  return z.object({
    evaluations: z
      .array(CourseEvaluationItemSchema)
      .min(minItems)
      .max(maxItems)
      .describe('Array of course evaluations'),
  });
}

// Re-export the type from type.ts for consistency
export type RelevanceScore = 0 | 1 | 2 | 3;

// Manually define the type to ensure RelevanceScore is used correctly
// z.infer doesn't properly extract type predicates from .refine()
export type LlmCourseEvaluationItem = {
  code: string;
  score: RelevanceScore;
  reason: string;
};

export type LlmCourseRetrievalEvaluator = {
  evaluations: LlmCourseEvaluationItem[];
};
