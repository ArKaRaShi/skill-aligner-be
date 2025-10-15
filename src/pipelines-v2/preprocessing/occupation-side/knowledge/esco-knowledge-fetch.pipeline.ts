import axios from 'axios';
import { ESCO_API_RESOURCE } from 'src/pipelines-v2/shared/constants/api.constant';
import { SlugHelper } from 'src/pipelines-v2/shared/helpers/slug.helper';
import { Knowledge } from 'src/pipelines-v2/shared/types/knowledge.type';
import { IPipeline } from 'src/pipelines/i-pipeline.contract';
import { SourceType } from 'src/pipelines/shared/types';
import { v4 as uuidv4 } from 'uuid';

import { RawEscoKnowledge } from '../occupation/types/esco.type';

export class EscoKnowledgeFetchPipeline
  implements IPipeline<string[], Knowledge[]>
{
  private readonly sourceName = 'ESCO';
  private readonly sourceType = SourceType.EXTERNAL;

  async execute(uris: string[]): Promise<Knowledge[]> {
    const knowledgeItems: Knowledge[] = [];

    for (const uri of uris) {
      console.log(`Fetching knowledge for uri: ${uri}`);

      const rawKnowledge = await this.fetchKnowledge(uri);
      const knowledge = this.extractKnowledgeData(rawKnowledge);
      knowledgeItems.push(knowledge);

      // To avoid hitting rate limits when fetching from API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return knowledgeItems;
  }

  private extractKnowledgeData(rawData: RawEscoKnowledge): Knowledge {
    const name = rawData.title ?? '';
    const description = rawData.description?.en?.literal ?? '';
    const href = rawData._links?.self?.href ?? '';
    const slugId = SlugHelper.createId('knowledge', name);

    return {
      id: uuidv4(), // Generate a random UUID for internal use
      slugId,
      occupationId: [], // This will be populated by the occupation pipeline
      name,
      description,
      sourceMetadata: {
        sourceType: this.sourceType,
        sourceName: this.sourceName,
        sourceUrl: href,
        retrievedAt: new Date().toISOString(),
      },
    };
  }

  private async fetchKnowledge(uri: string): Promise<RawEscoKnowledge> {
    const url = `${ESCO_API_RESOURCE}/skill`; // Knowledge is fetched from skill endpoint
    const params = { uri };
    try {
      const { data } = await axios.get<RawEscoKnowledge>(url, { params });
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch knowledge for uri ${uri}: ${error}`);
    }
  }
}
