import { z } from 'zod';

export const SkillItemSchema = z.object({
  skill: z.string().min(1, 'Skill name cannot be empty'),
  reason: z.string().min(1, 'Reason cannot be empty'),
});

export const SkillExpansionSchema = z.object({
  skills: z
    .array(SkillItemSchema)
    .min(1, 'At least one skill must be provided'),
});

export type SkillItem = z.infer<typeof SkillItemSchema>;
export type LlmSkillExpansion = z.infer<typeof SkillExpansionSchema>;
