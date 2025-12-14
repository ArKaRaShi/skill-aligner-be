import { z } from 'zod';

export const CategoryEnum = z
  .enum([
    'relevant',
    'irrelevant',
    'dangerous',
    // 'unclear',
  ])
  .describe('Question classification categories');

export const QuestionClassificationSchema = z
  .object({
    category: CategoryEnum,
    reason: z.string().describe('Reason for the classification'),
  })
  .describe('Schema for question classification result');

export type LlmQuestionClassification = z.infer<
  typeof QuestionClassificationSchema
>;
