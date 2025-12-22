import { z } from 'zod';

import { SkillExpansionSchema } from '../schemas/skill-expansion.schema';

export type SkillExpansion = z.infer<typeof SkillExpansionSchema> & {
  rawQuestion: string;
};

export type TSkillItemV2 = {
  skill: string;
  learningOutcome: string;
  reason: string;
};

export type TSkillExpansionV2 = {
  skillItems: TSkillItemV2[];
};
