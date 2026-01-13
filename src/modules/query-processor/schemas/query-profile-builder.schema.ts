import { z } from 'zod';

export const LanguageEnum = z
  .enum(['en', 'th'])
  .describe('Language preference for query profile');

export type Language = z.infer<typeof LanguageEnum>;

export const QueryProfileBuilderSchema = z.object({
  language: LanguageEnum.describe('Language preference for query profile'),
});

export type LlmQueryProfileBuilder = z.infer<typeof QueryProfileBuilderSchema>;
