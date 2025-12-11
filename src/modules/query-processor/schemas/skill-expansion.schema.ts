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

// New schema (v2) for v3 prompt structure
export const SkillItemV2Schema = z.object({
  skill: z.string().min(1, 'Skill name cannot be empty'),
  reason: z.string().min(1, 'Reason cannot be empty'),
});

export const ExpandableSkillPathSchema = z.object({
  path_name: z.string().min(1, 'Path name cannot be empty'),
  skills: z
    .array(SkillItemV2Schema)
    .min(1, 'At least one skill must be provided per path'),
});

export const SkillExpansionV2Schema = z.object({
  core_skills: z
    .array(SkillItemV2Schema)
    .min(1, 'At least one core skill must be provided'),
  supporting_skills: z.array(SkillItemV2Schema),
  expandable_skill_paths: z.array(ExpandableSkillPathSchema).nullable(),
});

// Type exports
export type SkillItem = z.infer<typeof SkillItemSchema>;
export type LlmSkillExpansion = z.infer<typeof SkillExpansionSchema>;

export type SkillItemV2 = z.infer<typeof SkillItemV2Schema>;
export type ExpandableSkillPath = z.infer<typeof ExpandableSkillPathSchema>;
export type LlmSkillExpansionV2 = z.infer<typeof SkillExpansionV2Schema>;
