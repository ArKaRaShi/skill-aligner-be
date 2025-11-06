import { z } from 'zod';

import { ToolDispatcherSchema } from '../schemas/tool-dispatcher.schema';

export type ExecutionPlan = z.infer<typeof ToolDispatcherSchema>;
