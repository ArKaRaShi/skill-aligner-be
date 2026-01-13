import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { LlmMetadataBuilder } from 'src/shared/utils/llm-metadata.builder';

import { IQueryProfileBuilderService } from '../../contracts/i-query-profile-builder-service.contract';
import {
  QueryProfileBuilderPromptFactory,
  QueryProfileBuilderPromptVersion,
} from '../../prompts/query-profile-builder';
import { QueryProfileBuilderSchema } from '../../schemas/query-profile-builder.schema';
import { QueryProfile } from '../../types/query-profile.type';

@Injectable()
export class QueryProfileBuilderService implements IQueryProfileBuilderService {
  private readonly logger = new Logger(QueryProfileBuilderService.name);

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouter: ILlmRouterService,
    private readonly modelName: string,
  ) {}

  async buildQueryProfile(
    query: string,
    promptVersion: QueryProfileBuilderPromptVersion,
  ): Promise<QueryProfile> {
    this.logger.log(`Building query profile for: "${query}"`);

    const { getPrompts } = QueryProfileBuilderPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(promptVersion);
    const userPrompt = getUserPrompt(query);

    const result = await this.llmRouter.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema: QueryProfileBuilderSchema,
      model: this.modelName,
    });

    const { tokenUsage, llmInfo } = LlmMetadataBuilder.buildFromLlmResult(
      result,
      result.model,
      userPrompt,
      systemPrompt,
      promptVersion,
      'QueryProfileBuilderSchema',
    );

    this.logger.log(
      `Generated query profile: ${JSON.stringify(result.object, null, 2)}`,
    );

    return {
      ...result.object,
      llmInfo,
      tokenUsage,
    };
  }
}
