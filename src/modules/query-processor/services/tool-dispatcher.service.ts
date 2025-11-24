import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { REGISTER_TOOL } from '../constants/register-tool.constant';
import { IToolDispatcherService } from '../contracts/i-tool-dispatcher-service.contract';
import {
  getToolDispatcherUserPrompt,
  TOOL_DISPATCHER_SYSTEM_PROMPT,
} from '../prompts/tool-dispatcher.prompt';
import { ToolDispatcherSchema } from '../schemas/tool-dispatcher.schema';
import { RegisterTool } from '../types/register-tool.type';
import { ExecutionPlan } from '../types/tool-dispatcher.type';

@Injectable()
export class ToolDispatcherService implements IToolDispatcherService {
  private readonly logger = new Logger(ToolDispatcherService.name);

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
    private readonly modelName: string,
  ) {}

  async generateExecutionPlan(query: string): Promise<ExecutionPlan> {
    this.logger.log(`Generating execution plan for query: "${query}"`);

    const toolsContext = this.buildToolsContext(REGISTER_TOOL);
    const { object: llmResult } = await this.llmProviderClient.generateObject({
      prompt: getToolDispatcherUserPrompt(query, toolsContext),
      systemPrompt: TOOL_DISPATCHER_SYSTEM_PROMPT,
      schema: ToolDispatcherSchema,
      model: this.modelName,
    });

    this.logger.log(
      `Generated execution plan: ${JSON.stringify(llmResult, null, 2)}`,
    );
    return llmResult;
  }

  private buildToolsContext(tools: RegisterTool[]): string {
    return tools
      .map(
        (tool) => `
Tool ID: ${tool.id}
Name: ${tool.name}
Description: ${tool.description}
Dependencies: ${tool.dependsOn?.join(', ') || 'none'}
Input Example: ${JSON.stringify(tool.inputExample || {})}
Output Example: ${JSON.stringify(tool.outputExample || {})}
`,
      )
      .join('\n---\n');
  }
}
