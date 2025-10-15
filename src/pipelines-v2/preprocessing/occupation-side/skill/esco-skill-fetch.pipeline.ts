import axios from 'axios';
import { ESCO_API_RESOURCE } from 'src/pipelines-v2/shared/constants/api.constant';
import { SlugHelper } from 'src/pipelines-v2/shared/helpers/slug.helper';
import { Skill } from 'src/pipelines-v2/shared/types/skill.type';
import { IPipeline } from 'src/pipelines/i-pipeline.contract';
import { SourceType } from 'src/pipelines/shared/types';
import { v4 as uuidv4 } from 'uuid';

import { RawEscoSkill } from '../occupation/types/esco.type';

export class EscoSkillFetchPipeline implements IPipeline<string[], Skill[]> {
  private readonly sourceName = 'ESCO';
  private readonly sourceType = SourceType.EXTERNAL;

  async execute(uris: string[]): Promise<Skill[]> {
    const skills: Skill[] = [];

    for (const uri of uris) {
      console.log(`Fetching skill for uri: ${uri}`);

      const rawSkill = await this.fetchSkill(uri);
      const skill = this.extractSkillData(rawSkill);
      skills.push(skill);

      // To avoid hitting rate limits when fetching from API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return skills;
  }

  private extractSkillData(rawData: RawEscoSkill): Skill {
    const nameEn = rawData.title ?? '';
    const descriptionEn = rawData.description?.en?.literal ?? '';
    const href = rawData._links?.self?.href ?? '';
    const slugId = SlugHelper.createId('skill', nameEn);

    return {
      id: uuidv4(), // Generate a random UUID for internal use
      slugId,
      occupationId: [], // This will be populated by the occupation pipeline
      nameEn,
      descriptionEn,
      sourceMetadata: {
        sourceType: this.sourceType,
        sourceName: this.sourceName,
        sourceUrl: href,
        retrievedAt: new Date().toISOString(),
      },
    };
  }

  private async fetchSkill(uri: string): Promise<RawEscoSkill> {
    const url = `${ESCO_API_RESOURCE}/skill`;
    const params = { uri };
    try {
      const { data } = await axios.get<RawEscoSkill>(url, { params });
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch skill for uri ${uri}: ${error}`);
    }
  }
}
