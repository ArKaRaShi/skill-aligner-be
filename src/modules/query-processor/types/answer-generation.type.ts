import { z } from 'zod';

import { AnswerGenerationSchema } from '../schemas/answer-generation.schema';

export type AnswerGeneration = z.infer<typeof AnswerGenerationSchema> & {
  rawQuestion: string;
  context: string;
};
