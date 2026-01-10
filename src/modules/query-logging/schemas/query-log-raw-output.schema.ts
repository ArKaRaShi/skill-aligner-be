import { z } from 'zod';

/**
 * Zod schemas for validating raw output types from JSONB storage.
 *
 * These schemas ensure type safety when deserializing data from the database.
 * Maps are stored as Objects in JSONB, so we validate as Record<string, unknown>
 * and convert back to Map in the parser helper.
 */

// ============================================================================
// CLASSIFICATION STEP
// ============================================================================

export const ClassificationRawOutputSchema = z.object({
  category: z.string(),
  reason: z.string(),
});

// ============================================================================
// QUERY PROFILE STEP
// ============================================================================

export const QueryProfileRawOutputSchema = z.object({
  language: z.enum(['en', 'th']),
});

// ============================================================================
// SKILL EXPANSION STEP
// ============================================================================

const SkillItemSchema = z.object({
  skill: z.string(),
  reason: z.string(),
});

export const SkillExpansionRawOutputSchema = z.object({
  skillItems: z.array(SkillItemSchema),
});

// ============================================================================
// COURSE RETRIEVAL STEP
// ============================================================================

const EmbeddingUsageBySkillSchema = z.object({
  skill: z.string(),
  model: z.string(),
  provider: z.string(),
  dimension: z.number(),
  promptTokens: z.number(),
  totalTokens: z.number(),
});

const EmbeddingUsageSchema = z.object({
  bySkill: z.array(EmbeddingUsageBySkillSchema),
  totalTokens: z.number(),
});

// Note: skillCoursesMap is stored as Record<string, unknown> in JSONB
// Parser will convert it back to Map<string, Course[]>
export const CourseRetrievalRawOutputSchema = z.object({
  skills: z.array(z.string()),
  skillCoursesMap: z.record(z.string(), z.array(z.unknown())), // Will be converted to Map
  embeddingUsage: EmbeddingUsageSchema.optional(),
});

// ============================================================================
// COURSE FILTER STEP
// ============================================================================

// CourseFilterRawOutput is CourseRelevanceFilterResultV2
// This is imported from query-processor, so we don't redefine it here

// ============================================================================
// COURSE AGGREGATION STEP
// ============================================================================

// Note: filteredSkillCoursesMap is stored as Record<string, unknown> in JSONB
// Parser will convert it back to Map
export const CourseAggregationRawOutputSchema = z.object({
  filteredSkillCoursesMap: z.record(z.string(), z.array(z.unknown())), // Will be converted to Map
  rankedCourses: z.array(z.unknown()), // AggregatedCourseSkills - will need proper import
});

// ============================================================================
// ANSWER SYNTHESIS STEP
// ============================================================================

export const AnswerSynthesisRawOutputSchema = z.object({
  answer: z.string(),
});

// ============================================================================
// DISCRIMINATED UNION
// ============================================================================

/**
 * Schema that validates any raw output based on stepName discriminator.
 * Returns the validated and typed raw output.
 */
export const createRawOutputSchema = (stepName: string) => {
  switch (stepName) {
    case 'QUESTION_CLASSIFICATION':
      return ClassificationRawOutputSchema;
    case 'QUERY_PROFILE_BUILDING':
      return QueryProfileRawOutputSchema;
    case 'SKILL_EXPANSION':
      return SkillExpansionRawOutputSchema;
    case 'COURSE_RETRIEVAL':
      return CourseRetrievalRawOutputSchema;
    case 'COURSE_RELEVANCE_FILTER':
      // Use the schema from query-processor for this one
      return z.any(); // Will be handled separately with proper import
    case 'COURSE_AGGREGATION':
      return CourseAggregationRawOutputSchema;
    case 'ANSWER_SYNTHESIS':
      return AnswerSynthesisRawOutputSchema;
    default:
      throw new Error(`Unknown stepName: ${stepName}`);
  }
};
