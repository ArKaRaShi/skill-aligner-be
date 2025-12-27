import { z } from 'zod';

import { LlmInfo } from 'src/common/types/llm-info.type';
import { TokenUsage } from 'src/common/types/token-usage.type';

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
