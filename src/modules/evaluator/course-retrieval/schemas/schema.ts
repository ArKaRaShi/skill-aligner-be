import { z } from 'zod';

// Helper schema for relevance score with type predicate
const RelevanceScoreSchema = z
  .number()
  .int('Score must be an integer')
  .refine((val): val is 0 | 1 | 2 | 3 => val >= 0 && val <= 3, {
    message: 'Score must be exactly 0, 1, 2, or 3',
  });

export const CourseEvaluationItemSchema = z.object({
  course_name: z.string().min(1).describe('Name of the course'),
  course_code: z.string().min(1).describe('Code of the course'),
  skill_relevance_score: RelevanceScoreSchema.describe(
    'Relevance score for the skill',
  ),
  context_alignment_score: RelevanceScoreSchema.describe(
    'Alignment score for the context',
  ),
  skill_reason: z
    .string()
    .min(1)
    .describe('Reasoning for the assigned skill relevance score'),
  context_reason: z
    .string()
    .min(1)
    .describe('Reasoning for the assigned context alignment score'),
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
  course_name: string;
  course_code: string;
  skill_relevance_score: RelevanceScore;
  context_alignment_score: RelevanceScore;
  skill_reason: string;
  context_reason: string;
};

export type LlmCourseRetrievalEvaluator = {
  evaluations: LlmCourseEvaluationItem[];
};
