import { z } from 'zod';

/**
 * Zod schema for entity extraction from user questions
 * Used to validate LLM responses
 */

/**
 * Single entity extraction schema
 * Common structure for all entity types
 */
export const ExtractedEntitySchema = z.object({
  name: z.string().describe('The entity name as mentioned or inferred'),
  normalizedLabel: z
    .string()
    .describe(
      'Lowercase, hyphenated version: e.g., "machine-learning", "data-scientist"',
    ),
  confidence: z
    .enum(['HIGH', 'MEDIUM', 'LOW'])
    .describe(
      'Confidence level: HIGH (explicit), MEDIUM (inferred), LOW (uncertain)',
    ),
  source: z
    .enum(['explicit', 'inferred'])
    .describe(
      'Source: explicit (direct mention) or inferred (derived from context)',
    ),
});

/**
 * Complete entity extraction schema
 * Matches the system prompt output format
 */
export const EntityExtractionSchema = z.object({
  mentionTopics: z
    .array(ExtractedEntitySchema)
    .describe('Broad knowledge areas extracted from the question')
    .default([]),
  mentionSkills: z
    .array(ExtractedEntitySchema)
    .describe('Specific, measurable abilities extracted from the question')
    .default([]),
  mentionTasks: z
    .array(ExtractedEntitySchema)
    .describe('Concrete activities requiring skills')
    .default([]),
  mentionRoles: z
    .array(ExtractedEntitySchema)
    .describe('Job or position titles')
    .default([]),
  unmappedConcepts: z
    .array(z.string())
    .describe(
      'Concepts mentioned but not fitting the 4 types (e.g., course codes)',
    )
    .default([]),
  overallQuality: z
    .enum(['high', 'medium', 'low', 'none'])
    .describe(
      'Overall extraction quality: high (HIGH confidence + clear intent), medium (MEDIUM confidence + reasonable intent), low (LOW confidence + ambiguous), none (no entities)',
    ),
  reasoning: z
    .string()
    .describe('Brief explanation of the extraction quality assessment'),
});

/**
 * Type inference from Zod schema
 */
export type EntityExtraction = z.infer<typeof EntityExtractionSchema>;
