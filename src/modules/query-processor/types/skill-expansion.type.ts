import { z } from 'zod';

import { SkillExpansionSchema } from '../schemas/skill-expansion.schema';

export type SkillExpansion = z.infer<typeof SkillExpansionSchema> & {
  rawQuestion: string;
};
