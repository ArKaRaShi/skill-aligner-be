import { z } from 'zod';

import { AnswerSynthesisSchema } from '../schemas/answer-synthesis.schema';

export type AnswerSynthesis = z.infer<typeof AnswerSynthesisSchema>;
export type AnswerSynthesisResult = z.infer<typeof AnswerSynthesisSchema> & {
  question: string;
};
