import { SkillExpansion } from '../types/skill-expansion.type';

export const I_SKILL_EXPANDER_SERVICE_TOKEN = Symbol('ISkillExpanderService');

export interface ISkillExpanderService {
  expandSkills(question: string): Promise<SkillExpansion>;
}
