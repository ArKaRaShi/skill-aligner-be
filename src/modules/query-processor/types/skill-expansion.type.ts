import { LlmInfo } from 'src/shared/domain/types/llm-info.type';
import { TokenUsage } from 'src/shared/domain/types/token-usage.type';

export type TSkill = {
  skill: string;
  reason: string;
};

export type TSkillExpansion = {
  skillItems: TSkill[];
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};

export type TSkillItemV2 = TSkill & {
  learningOutcome: string;
};

export type TSkillExpansionV2 = {
  skillItems: TSkillItemV2[];
  llmInfo: LlmInfo;
  tokenUsage: TokenUsage;
};
