export type TSkill = {
  skill: string;
  reason: string;
};

export type TSkillExpansion = {
  skillItems: TSkill[];
};

export type TSkillItemV2 = TSkill & {
  learningOutcome: string;
};

export type TSkillExpansionV2 = {
  skillItems: TSkillItemV2[];
};
