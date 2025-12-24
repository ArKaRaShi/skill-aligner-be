import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/core/gpt-llm/contracts/i-llm-provider-client.contract';

import { IQueryProfileBuilderService } from '../../contracts/i-query-profile-builder-service.contract';
import { QueryProfileBuilderPromptFactory } from '../../prompts/query-profile-builder';
import { QueryProfileBuilderSchema } from '../../schemas/query-profile-builder.schema';
import { QueryProfile } from '../../types/query-profile.type';

@Injectable()
export class QueryProfileBuilderService implements IQueryProfileBuilderService {
  private readonly logger = new Logger(QueryProfileBuilderService.name);

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
    private readonly modelName: string,
  ) {}

  async buildQueryProfile(query: string): Promise<QueryProfile> {
    this.logger.log(`Building query profile for: "${query}"`);

    const { getPrompts } = QueryProfileBuilderPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts('v2');

    const { object: profileData } = await this.llmProviderClient.generateObject(
      {
        prompt: getUserPrompt(query),
        systemPrompt,
        schema: QueryProfileBuilderSchema,
        model: this.modelName,
      },
    );

    this.logger.log(
      `Generated query profile: ${JSON.stringify(profileData, null, 2)}`,
    );

    return profileData;
  }
}
