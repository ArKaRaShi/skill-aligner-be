import { ToolExecutionStep } from '../schemas/tool-dispatcher.schema';

export type RegisterTool = {
  id: string;
  name: string;
  description: string;

  inputExample?: any;
  outputExample?: any;

  hintPairing?: string[];
  dependsOn?: string[];
};

export type ExecutionPlan = ToolExecutionStep[][];
