import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';
import { z } from 'zod';

import {
  CategoryEnum,
  QuestionClassificationSchema,
} from '../schemas/question-classification.schema';

export type TQuestionClassification = z.infer<
  typeof QuestionClassificationSchema
> & {
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};

export type TClassificationCategory = z.infer<typeof CategoryEnum>;
