import { z } from 'zod';

export const AnswerSynthesisSchema = z.object({
  answerText: z.string().min(1, 'Answer cannot be empty'),
});

export type AnswerSynthesis = z.infer<typeof AnswerSynthesisSchema>;
