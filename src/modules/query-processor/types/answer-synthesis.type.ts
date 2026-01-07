import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

export type AnswerSynthesisResult = {
  answerText: string;
  question: string;
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};
