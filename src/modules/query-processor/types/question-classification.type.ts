import { z } from 'zod';

import {
  Classification as ClassificationEnum,
  QuestionClassificationSchema,
} from '../schemas/question-classification.schema';

export type QuestionClassification = z.infer<
  typeof QuestionClassificationSchema
> & {
  model: string;
  userPrompt: string;
  systemPrompt: string;
  promptVersion: string;
};

export type Classification = z.infer<typeof ClassificationEnum>;
