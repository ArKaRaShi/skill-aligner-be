import axios from 'axios';
import { IPipeline } from 'src/pipelines/i-pipeline.contract';
import { SourceType } from 'src/pipelines/shared/types';
import { v4 as uuidv4 } from 'uuid';

import { ESCO_API_RESOURCE } from '../../../shared/constants/api.constant';
import { SlugHelper } from '../../../shared/helpers/slug.helper';
import { Occupation } from '../../../shared/types/occupation.type';
import { EscoKnowledgeFetchPipeline } from '../knowledge/esco-knowledge-fetch.pipeline';
import { EscoSkillFetchPipeline } from '../skill/esco-skill-fetch.pipeline';
import { RawEscoOccupation } from './types/esco.type';

export class EscoOccupationFetchPipeline
  implements IPipeline<string[], Occupation[]>
{
  private readonly sourceName = 'ESCO';
  private readonly sourceType = SourceType.EXTERNAL;
  private readonly skillPipeline: EscoSkillFetchPipeline;
  private readonly knowledgePipeline: EscoKnowledgeFetchPipeline;

  constructor() {
    this.skillPipeline = new EscoSkillFetchPipeline();
    this.knowledgePipeline = new EscoKnowledgeFetchPipeline();
  }

  async execute(uris: string[]): Promise<Occupation[]> {
    const occupations: Occupation[] = [];

    for (const uri of uris) {
      console.log(`Fetching occupation for uri: ${uri}`);

      const rawOccupation = await this.fetchOccupation(uri);
      const occupation = this.extractOccupationData(rawOccupation);

      // Separate skill and knowledge URIs
      const skillUris: string[] = [];
      const knowledgeUris: string[] = [];

      for (const skillLink of rawOccupation._links?.hasEssentialSkill ?? []) {
        const skillType = skillLink.skillType ?? 'unknown';
        if (skillType.endsWith('knowledge')) {
          knowledgeUris.push(skillLink.uri);
        } else if (skillType.endsWith('skill')) {
          skillUris.push(skillLink.uri);
        } else {
          console.warn(`Unknown skill type for uri ${skillLink.uri}`);
        }
      }

      // Fetch skills and knowledge in parallel
      const [skills, knowledge] = await Promise.all([
        this.skillPipeline.execute(skillUris),
        this.knowledgePipeline.execute(knowledgeUris),
      ]);

      occupation.skills = skills;
      occupation.knowledge = knowledge;
      occupations.push(occupation);
    }

    return occupations;
  }

  private extractOccupationData(rawData: RawEscoOccupation): Occupation {
    const name = rawData.title ?? '';
    const description = rawData.description?.en?.literal ?? '';
    const href = rawData._links?.self?.href ?? '';
    const slugId = SlugHelper.createId('occupation', name);

    return {
      id: uuidv4(), // Generate a random UUID for internal use
      slugId,
      name,
      description,
      skills: [], // Will be populated later
      knowledge: [], // Will be populated later
      sourceMetadata: {
        sourceType: this.sourceType,
        sourceName: this.sourceName,
        sourceUrl: href,
        retrievedAt: new Date().toISOString(),
      },
    };
  }

  private async fetchOccupation(
    uri: string,
    language: string = 'en',
  ): Promise<RawEscoOccupation> {
    const url = `${ESCO_API_RESOURCE}/occupation`;
    const params = { uri, language };
    try {
      const { data } = await axios.get<RawEscoOccupation>(url, { params });
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch occupation for uri ${uri}: ${error}`);
    }
  }
}
