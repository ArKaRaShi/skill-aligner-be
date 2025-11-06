import { z } from 'zod';

export const ToolExecutionStepSchema = z.object({
  id: z.string().min(1, 'Tool ID cannot be empty'),
  dependsOn: z.union([z.array(z.string()), z.null()]).optional(),
});

export const ToolDispatcherSchema = z
  .array(
    z
      .array(ToolExecutionStepSchema)
      .min(1, 'Each batch must contain at least one tool'),
  )
  .min(1, 'At least one execution batch must be provided');

export type ToolExecutionStep = z.infer<typeof ToolExecutionStepSchema>;
export type LlmToolDispatcher = z.infer<typeof ToolDispatcherSchema>;
