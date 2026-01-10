import { Injectable } from '@nestjs/common';

import { LlmMetadataBuilder } from 'src/shared/utils/llm-metadata.builder';

import { IQueryProfileBuilderService } from '../../contracts/i-query-profile-builder-service.contract';
import { QueryProfile } from '../../types/query-profile.type';

@Injectable()
export class MockQueryProfileBuilderService
  implements IQueryProfileBuilderService
{
  async buildQueryProfile(query: string): Promise<QueryProfile> {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async delay

    const { tokenUsage, llmInfo } = LlmMetadataBuilder.buildEmpty(
      'mock-model',
      'v3',
    );

    // Detect language based on Thai character presence
    const hasThaiChars = /[\u0E00-\u0E7F]/.test(query);
    const language = hasThaiChars ? 'th' : 'en';

    return {
      language,
      llmInfo,
      tokenUsage,
    };
  }
}
