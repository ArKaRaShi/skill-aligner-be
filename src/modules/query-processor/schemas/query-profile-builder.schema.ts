import { z } from 'zod';

export const IntentEnum = z.enum(['ask-skills', 'ask-occupation', 'unknown']);

export const IntentQueryTransformationSchema = z.object({
  original: z.string().min(1, 'Original intent cannot be empty'),
  augmented: IntentEnum,
});

export const QueryTransformationSchema = z.object({
  original: z.string().min(1, 'Original text cannot be empty'),
  augmented: z.string().min(1, 'Augmented text cannot be empty'),
});

export const QueryProfileBuilderSchema = z.object({
  intents: z.array(IntentQueryTransformationSchema).default([]),
  preferences: z.array(QueryTransformationSchema).default([]),
  background: z.array(QueryTransformationSchema).default([]),
});

export type LlmQueryProfileBuilder = z.infer<typeof QueryProfileBuilderSchema>;
