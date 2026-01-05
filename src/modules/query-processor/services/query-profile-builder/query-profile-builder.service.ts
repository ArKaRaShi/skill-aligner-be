import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import { IQueryProfileBuilderService } from '../../contracts/i-query-profile-builder-service.contract';
import { QueryProfileBuilderPromptFactory } from '../../prompts/query-profile-builder';
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

  async buildQueryProfile(query: string): Promise<QueryProfile> {
    this.logger.log(`Building query profile for: "${query}"`);

    const { getPrompts } = QueryProfileBuilderPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts('v2');
    const userPrompt = getUserPrompt(query);

    const result = await this.llmRouter.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema: QueryProfileBuilderSchema,
      model: this.modelName,
    });

    const {
      object: profileData,
      inputTokens,
      outputTokens,
      provider,
      finishReason,
      warnings,
      providerMetadata,
      response,
      hyperParameters,
    } = result;

    const tokenUsage: TokenUsage = {
      model: this.modelName,
      inputTokens,
      outputTokens,
    };

    const llmInfo: LlmInfo = {
      model: this.modelName,
      provider,
      inputTokens,
      outputTokens,
      userPrompt,
      systemPrompt,
      promptVersion: 'v2',
      schemaName: 'QueryProfileBuilderSchema',
      schemaShape: QueryProfileBuilderSchema.shape,
      finishReason,
      warnings,
      providerMetadata,
      response,
      hyperParameters,
    };

    this.logger.log(
      `Generated query profile: ${JSON.stringify(profileData, null, 2)}`,
    );

    return {
      ...profileData,
      llmInfo,
      tokenUsage,
    };
  }
}
