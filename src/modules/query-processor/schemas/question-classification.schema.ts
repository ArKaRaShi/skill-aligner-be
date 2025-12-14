import { z } from 'zod';

export const CategoryEnum = z
  .enum([
    'relevant',
    'irrelevant',
    'dangerous',
    // 'unclear',
  ])
  .describe('Question classification categories');

export const PatternEnum = z
  .enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'])
  .nullable()
  .describe('Question classification patterns');

export const QuestionClassificationSchema = z
  .object({
    category: CategoryEnum,
    pattern: PatternEnum,
    reason: z.string().describe('Reason for the classification'),
  })
  .describe('Schema for question classification result');

export type LlmQuestionClassification = z.infer<
  typeof QuestionClassificationSchema
>;
