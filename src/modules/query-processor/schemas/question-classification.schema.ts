import { z } from 'zod';

export const Classification = z.enum([
  'relevant',
  'dangerous',
  'out_of_scope',
  'unclear',
]);

export const QuestionClassificationSchema = z.object({
  classification: Classification,
  reason: z.string(),
});

export type LlmQuestionClassification = z.infer<
  typeof QuestionClassificationSchema
>;
