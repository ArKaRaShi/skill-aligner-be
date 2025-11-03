import { z } from 'zod';

import {
  Classification as ClassificationEnum,
  QuestionClassificationSchema,
} from '../schemas/question-classification.schema';

export type QuestionClassification = z.infer<
  typeof QuestionClassificationSchema
> & {
  rawQuestion: string;
};

export type Classification = z.infer<typeof ClassificationEnum>;
