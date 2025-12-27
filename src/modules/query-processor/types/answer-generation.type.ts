import { z } from 'zod';

import { LlmInfo } from 'src/common/types/llm-info.type';
import { TokenUsage } from 'src/common/types/token-usage.type';

import { AnswerGenerationSchema } from '../schemas/answer-generation.schema';

export type AnswerGeneration = z.infer<typeof AnswerGenerationSchema> & {
  rawQuestion: string;
  context: string;
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};
