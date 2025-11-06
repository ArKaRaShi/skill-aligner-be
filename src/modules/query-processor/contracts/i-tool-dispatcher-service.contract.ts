import { ExecutionPlan } from '../constants/register-tool.constant';

export const I_TOOL_DISPATCHER_SERVICE_TOKEN = Symbol('IToolDispatcherService');

export interface IToolDispatcherService {
  /**
   * Generates an execution plan for given query using LLM one-shot dispatching
   * @param query The user query to analyze
   * @returns Execution plan with parallel batches and dependencies
   */
  generateExecutionPlan(query: string): Promise<ExecutionPlan>;
}
