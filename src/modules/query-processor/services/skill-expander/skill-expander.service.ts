import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/modules/gpt-llm/contracts/i-llm-provider-client.contract';

import { QuestionSkillCache } from '../../cache/question-skill.cache';
import { ISkillExpanderService } from '../../contracts/i-skill-expander-service.contract';
import {
  EXPAND_SKILL_SYSTEM_PROMPT,
  getExpandSkillUserPrompt,
} from '../../prompts/skill-expansion/expand-skill.prompt';
import { SkillExpansionSchema } from '../../schemas/skill-expansion.schema';
import { SkillExpansion } from '../../types/skill-expansion.type';

@Injectable()
export class SkillExpanderService implements ISkillExpanderService {
  private readonly logger = new Logger(SkillExpanderService.name);

  constructor(
    @Inject(I_LLM_PROVIDER_CLIENT_TOKEN)
    private readonly llmProviderClient: ILlmProviderClient,
    private readonly modelName: string,
    private readonly cache: QuestionSkillCache,
    private readonly useCache: boolean,
  ) {}

  async expandSkills(question: string): Promise<SkillExpansion> {
    if (this.useCache) {
      const cached = this.cache.lookup(question);
      if (cached) {
        this.logger.log(`Cache hit for question: "${question}"`);
        return cached;
      }
    }

    const {
      object: { skills },
    } = await this.llmProviderClient.generateObject({
      prompt: getExpandSkillUserPrompt(question),
      systemPrompt: EXPAND_SKILL_SYSTEM_PROMPT,
      schema: SkillExpansionSchema,
      model: this.modelName,
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

    const result: SkillExpansion = {
      skills: Array.from(normalizedSkills.values()),
      rawQuestion: question,
    };
    if (this.useCache) {
      this.cache.store(question, result);
    }
    return result;
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
