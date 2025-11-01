import { Inject, Injectable } from '@nestjs/common';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { ISkillExpanderService } from '../../contracts/i-skill-expander-service.contract';
import {
  EXPAND_SKILL_SYSTEM_PROMPT,
  getExpandSkillUserPrompt,
} from '../../prompts/expand-skill.prompt';
import { SkillExpansionSchema } from '../../schemas/skill-expansion.schema';
import { SkillExpansion } from '../../types/skill-expansion.type';

@Injectable()
export class SkillExpanderService implements ISkillExpanderService {
  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
  ) {}

  async expandSkills(question: string): Promise<SkillExpansion> {
    const { skills } = await this.llmProviderClient.generateObject({
      prompt: getExpandSkillUserPrompt(question),
      systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT,
      schema: SkillExpansionSchema,
    });

    const normalizedSkills = new Map<
      string,
      { skill: string; reason: string }
    >();

    for (const { skill, reason } of skills) {
      const normalizedSkill = this.normalizeSkillName(skill);
      if (!normalizedSkill) {
        continue;
      }

      const normalizedReason =
        reason?.trim() || 'Identified from user question';
      const key = normalizedSkill.toLowerCase();

      if (!normalizedSkills.has(key)) {
        normalizedSkills.set(key, {
          skill: normalizedSkill,
          reason: normalizedReason,
        });
      }
    }

    return {
      skills: Array.from(normalizedSkills.values()),
      rawQuestion: question,
    };
  }

  private normalizeSkillName(name: string): string {
    if (!name) {
      return '';
    }

    const cleaned = name
      .replace(/[^A-Za-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      return '';
    }

    return cleaned.toLowerCase();
  }
}
