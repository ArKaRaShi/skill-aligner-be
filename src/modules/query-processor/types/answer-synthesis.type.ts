import { z } from 'zod';

import { LlmInfo } from 'src/common/types/llm-info.type';
import { TokenUsage } from 'src/common/types/token-usage.type';

import { AnswerSynthesisSchema } from '../schemas/answer-synthesis.schema';

export type AnswerSynthesis = z.infer<typeof AnswerSynthesisSchema>;
export type AnswerSynthesisResult = z.infer<typeof AnswerSynthesisSchema> & {
  question: string;
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};
