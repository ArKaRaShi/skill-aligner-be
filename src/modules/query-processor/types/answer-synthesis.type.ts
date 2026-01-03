import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';
import { z } from 'zod';

import { AnswerSynthesisSchema } from '../schemas/answer-synthesis.schema';

export type AnswerSynthesis = z.infer<typeof AnswerSynthesisSchema>;
export type AnswerSynthesisResult = z.infer<typeof AnswerSynthesisSchema> & {
  question: string;
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};
