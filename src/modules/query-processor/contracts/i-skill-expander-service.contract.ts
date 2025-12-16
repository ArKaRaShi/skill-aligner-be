import {
  SkillExpansion,
  TSkillExpansionV2,
} from '../types/skill-expansion.type';

export const I_SKILL_EXPANDER_SERVICE_TOKEN = Symbol('ISkillExpanderService');

export interface ISkillExpanderService {
  expandSkills(question: string): Promise<SkillExpansion>;

  expandSkillsV2(question: string): Promise<TSkillExpansionV2>;
}
