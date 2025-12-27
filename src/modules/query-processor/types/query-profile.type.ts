import { z } from 'zod';

import { LlmInfo } from 'src/common/types/llm-info.type';
import { TokenUsage } from 'src/common/types/token-usage.type';

import { QueryProfileBuilderSchema } from '../schemas/query-profile-builder.schema';

export type QueryProfile = z.infer<typeof QueryProfileBuilderSchema> & {
  llmInfo?: LlmInfo;
  tokenUsage: TokenUsage;
};
