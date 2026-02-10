import { z } from 'zod';

// ============================================================================
// VERDICT ENUM
// ============================================================================

/**
 * Verdict enum for skill evaluation
 */
export const JUDGE_VERDICT_SCHEMA = z.enum(['PASS', 'FAIL']);

/**
 * Type for judge verdict
 */
export type JudgeVerdict = z.infer<typeof JUDGE_VERDICT_SCHEMA>;

// ============================================================================
// SKILL VERDICT SCHEMA
// ============================================================================

/**
 * Zod schema for a single skill verdict from the judge
 *
 * Simplified format: just verdict + note (no scores, issues, or suggestions)
 */
export const SKILL_VERDICT_SCHEMA = z.object({
  skill: z.string().min(1, 'Skill must not be empty'),
  verdict: JUDGE_VERDICT_SCHEMA,
  note: z.string().min(1, 'Note must not be empty'),
});

/**
 * Type for skill verdict
 */
export type SkillVerdictSchema = z.infer<typeof SKILL_VERDICT_SCHEMA>;

// ============================================================================
// OVERALL ASSESSMENT SCHEMA
// ============================================================================

/**
 * Zod schema for the overall assessment from the judge
 *
 * Simplified format: only conceptPreserved + summary
 */
export const OVERALL_ASSESSMENT_SCHEMA = z.object({
  conceptPreserved: z.boolean(),
  summary: z.string().min(1, 'Summary must not be empty'),
});

/**
 * Type for overall assessment
 */
export type OverallAssessmentSchema = z.infer<typeof OVERALL_ASSESSMENT_SCHEMA>;

// ============================================================================
// JUDGE OUTPUT SCHEMA
// ============================================================================

/**
 * Zod schema for the complete judge output
 */
export const SKILL_EXPANSION_JUDGE_OUTPUT_SCHEMA = z.object({
  skills: z
    .array(SKILL_VERDICT_SCHEMA)
    .min(1, 'At least one skill verdict is required'),
  overall: OVERALL_ASSESSMENT_SCHEMA,
});

/**
 * Type for judge output
 */
export type SkillExpansionJudgeOutputSchema = z.infer<
  typeof SKILL_EXPANSION_JUDGE_OUTPUT_SCHEMA
>;

// ============================================================================
// PROGRESS ENTRY SCHEMA
// ============================================================================

/**
 * Zod schema for a single progress entry
 *
 * Simplified to match new judge output format
 */
export const PROGRESS_ENTRY_SCHEMA = z.object({
  hash: z.string().min(1),
  queryLogId: z.string().min(1),
  question: z.string().min(1),
  skill: z.string().min(1),
  completedAt: z.string().datetime(),
  result: z.object({
    verdict: JUDGE_VERDICT_SCHEMA,
    note: z.string(),
  }),
});

/**
 * Type for progress entry
 */
export type ProgressEntrySchema = z.infer<typeof PROGRESS_ENTRY_SCHEMA>;

// ============================================================================
// PROGRESS FILE SCHEMA
// ============================================================================

/**
 * Zod schema for the progress file
 */
export const PROGRESS_FILE_SCHEMA = z.object({
  testSetName: z.string().min(1),
  iterationNumber: z.number().int().min(1),
  entries: z.array(PROGRESS_ENTRY_SCHEMA),
  lastUpdated: z.string().datetime(),
  statistics: z.object({
    totalItems: z.number().int().min(0),
    completedItems: z.number().int().min(0),
    pendingItems: z.number().int().min(0),
    completionPercentage: z.number().min(0).max(100),
  }),
});

/**
 * Type for progress file
 */
export type ProgressFileSchema = z.infer<typeof PROGRESS_FILE_SCHEMA>;

// ============================================================================
// DYNAMIC SCHEMA FACTORY
// ============================================================================

/**
 * Creates a judge output schema with validation for expected skill count
 *
 * @param minSkills - Minimum expected number of skills (default: 1)
 * @param maxSkills - Maximum expected number of skills (optional)
 * @returns Zod schema for judge output with count validation
 */
export function getJudgeOutputSchema(
  minSkills: number = 1,
  maxSkills?: number,
) {
  let skillsSchema = z.array(SKILL_VERDICT_SCHEMA).min(minSkills);

  if (maxSkills !== undefined) {
    skillsSchema = skillsSchema.max(maxSkills);
  }

  return z.object({
    skills: skillsSchema,
    overall: OVERALL_ASSESSMENT_SCHEMA,
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates judge output against the schema
 *
 * @param data - Unknown data to validate
 * @returns Parsed and validated judge output
 * @throws ZodError if validation fails
 */
export function validateJudgeOutput(
  data: unknown,
): SkillExpansionJudgeOutputSchema {
  return SKILL_EXPANSION_JUDGE_OUTPUT_SCHEMA.parse(data);
}

/**
 * Safely validates judge output, returning null if invalid
 *
 * @param data - Unknown data to validate
 * @returns Parsed judge output or null if validation fails
 */
export function safeValidateJudgeOutput(
  data: unknown,
): SkillExpansionJudgeOutputSchema | null {
  const result = SKILL_EXPANSION_JUDGE_OUTPUT_SCHEMA.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Validates progress file against the schema
 *
 * @param data - Unknown data to validate
 * @returns Parsed and validated progress file
 * @throws ZodError if validation fails
 */
export function validateProgressFile(data: unknown): ProgressFileSchema {
  return PROGRESS_FILE_SCHEMA.parse(data);
}

/**
 * Safely validates progress file, returning null if invalid
 *
 * @param data - Unknown data to validate
 * @returns Parsed progress file or null if validation fails
 */
export function safeValidateProgressFile(
  data: unknown,
): ProgressFileSchema | null {
  const result = PROGRESS_FILE_SCHEMA.safeParse(data);
  return result.success ? result.data : null;
}
