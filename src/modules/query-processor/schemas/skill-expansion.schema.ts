import { z } from 'zod';

// Original schema (v1)
export const SkillItemSchema = z.object({
  skill: z.string().min(1, 'Skill name cannot be empty'),
  reason: z.string().min(1, 'Reason cannot be empty'),
});

export const SkillExpansionSchema = z.object({
  skills: z
    .array(SkillItemSchema)
    .min(1, 'At least one skill must be provided'),
});

export const SkillItemV2Schema = z.object({
  skill: z
    .string()
    .min(1, 'Skill name cannot be empty')
    .describe('Name of the skill in Thai language'),
  learning_outcome: z
    .string()
    .min(1, 'Learning outcome cannot be empty')
    .describe(
      'A specific learning outcome for acquiring the skill in Thai language',
    ),
  reason: z
    .string()
    .min(1, 'Reason cannot be empty')
    .describe(
      'Justification for selecting this skill based on the user question in Thai language',
    ),
});

export const SkillExpansionV2Schema = z.object({
  skills: z
    .array(SkillItemV2Schema)
    .describe('Array of expanded skills with learning outcomes and reasons'),
});

// Type exports
export type SkillItem = z.infer<typeof SkillItemSchema>;
export type LlmSkillExpansion = z.infer<typeof SkillExpansionSchema>;

export type LlmSkillExpansionV2 = z.infer<typeof SkillExpansionV2Schema>;
