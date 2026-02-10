import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

export type TSkillItem = {
  skill: string;
  reason: string;
};

export type ExpandSkillsUseCaseOutput = {
  skillItems: TSkillItem[];
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};
