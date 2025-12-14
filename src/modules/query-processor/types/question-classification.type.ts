import { z } from 'zod';

import {
  CategoryEnum,
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
