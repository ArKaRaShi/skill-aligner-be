import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';
import { z } from 'zod';

import { QueryProfileBuilderSchema } from '../schemas/query-profile-builder.schema';

export type QueryProfile = z.infer<typeof QueryProfileBuilderSchema> & {
  llmInfo?: LlmInfo;
  tokenUsage: TokenUsage;
};
