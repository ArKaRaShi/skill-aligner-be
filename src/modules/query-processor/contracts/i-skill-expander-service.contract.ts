import { SkillExpansionPromptVersion } from '../prompts/skill-expansion';
import {
  TSkillExpansion,
  TSkillExpansionV2,
} from '../types/skill-expansion.type';

export const I_SKILL_EXPANDER_SERVICE_TOKEN = Symbol('ISkillExpanderService');

export interface ISkillExpanderService {
  expandSkills(
    question: string,
    promptVersion: SkillExpansionPromptVersion,
  ): Promise<TSkillExpansion>;

  expandSkillsV2(
    question: string,
    promptVersion: SkillExpansionPromptVersion,
  ): Promise<TSkillExpansionV2>;
}
