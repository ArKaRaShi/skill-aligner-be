import { LlmInfo } from 'src/shared/domain/types/llm-info.type';
import { TokenUsage } from 'src/shared/domain/types/token-usage.type';
import { z } from 'zod';

import { QueryProfileBuilderSchema } from '../schemas/query-profile-builder.schema';

export type QueryProfile = z.infer<typeof QueryProfileBuilderSchema> & {
  llmInfo?: LlmInfo;
  tokenUsage: TokenUsage;
};
