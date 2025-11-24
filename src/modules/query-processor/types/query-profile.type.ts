import { z } from 'zod';

import { QueryProfileBuilderSchema } from '../schemas/query-profile-builder.schema';

export type QueryProfile = z.infer<typeof QueryProfileBuilderSchema>;
