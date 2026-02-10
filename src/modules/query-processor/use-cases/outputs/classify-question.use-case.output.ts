import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

export type TClassificationCategory = 'relevant' | 'irrelevant' | 'dangerous';

export type ClassifyQuestionUseCaseOutput = {
  category: TClassificationCategory;
  reason: string;
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};
