import { z } from 'zod';

export const IntentEnum = z
  .enum(['ask-skills', 'ask-occupation', 'unknown'])
  .describe('Intent types for user queries');

export const LanguageEnum = z
  .enum(['en', 'th'])
  .describe('Language preference for query profile');

export const IntentQueryTransformationSchema = z.object({
  original: z.string().min(1, 'Original intent cannot be empty'),
  augmented: IntentEnum,
});

export const QueryTransformationSchema = z.object({
  original: z.string().min(1, 'Original text cannot be empty'),
  augmented: z.string().min(1, 'Augmented text cannot be empty'),
});

export const QueryProfileBuilderSchema = z.object({
  intents: z
    .array(IntentQueryTransformationSchema)
    .default([])
    .describe('List of intent transformations'),
  preferences: z
    .array(QueryTransformationSchema)
    .default([])
    .describe('List of preference transformations'),
  background: z
    .array(QueryTransformationSchema)
    .default([])
    .describe('List of background transformations'),
  language: LanguageEnum.describe('Language preference for query profile'),
});

export type LlmQueryProfileBuilder = z.infer<typeof QueryProfileBuilderSchema>;
