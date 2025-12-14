import { z } from 'zod';

import {
  CategoryEnum,
  PatternEnum,
  QuestionClassificationSchema,
} from '../schemas/question-classification.schema';

export type TQuestionClassification = z.infer<
  typeof QuestionClassificationSchema
> & {
  model: string;
  userPrompt: string;
  systemPrompt: string;
  promptVersion: string;
  hyperParameters?: Record<string, any>;
};

export type TClassificationCategory = z.infer<typeof CategoryEnum>;
export type TClassificationPattern = z.infer<typeof PatternEnum>;
