import { z } from 'zod';

export const FilterLoItemSchema = z.object({
  learning_outcome: z.string().min(1).describe('Learning outcome text'),
  decision: z
    .enum(['yes', 'no'])
    .describe('Whether the learning outcome is relevant'),
  reason: z
    .string()
    .min(1)
    .describe('Brief justification for the learning outcome'),
});

export const FilterLoSchema = z.object({
  learning_outcomes: z
    .array(FilterLoItemSchema)
    .describe('Array of learning outcome decisions'),
});

export type LlmFilterLoItem = z.infer<typeof FilterLoItemSchema>;
export type LlmFilterLoResult = z.infer<typeof FilterLoSchema>;
