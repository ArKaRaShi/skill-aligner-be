import { z } from 'zod';

import {
  SkillExpansionSchema,
  SkillExpansionV2Schema,
} from '../schemas/skill-expansion.schema';

export type SkillExpansion = z.infer<typeof SkillExpansionSchema> & {
  rawQuestion: string;
};

export type SkillExpansionV2 = z.infer<typeof SkillExpansionV2Schema> & {
  rawQuestion: string;
};
