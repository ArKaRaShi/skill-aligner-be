import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { IQueryProfileBuilderService } from '../../contracts/i-query-profile-builder-service.contract';
import {
  getQueryProfileBuilderUserPrompt,
  QUERY_PROFILE_BUILDER_SYSTEM_PROMPT,
} from '../../prompts/query-profile-builder.prompt';
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

    const { object: profileData } = await this.llmProviderClient.generateObject(
      {
        prompt: getQueryProfileBuilderUserPrompt(query),
        systemPrompt: QUERY_PROFILE_BUILDER_SYSTEM_PROMPT,
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
