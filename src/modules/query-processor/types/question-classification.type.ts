import { z } from 'zod';

import { QuestionClassificationSchema } from '../schemas/question-classification.schema';

export type QuestionClassification = z.infer<
  typeof QuestionClassificationSchema
> & {
  rawQuestion: string;
};
