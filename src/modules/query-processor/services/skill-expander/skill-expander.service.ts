import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_PROVIDER_CLIENT_TOKEN,
  ILlmProviderClient,
} from 'src/core/gpt-llm/contracts/i-llm-provider-client.contract';

import { QuestionSkillCache } from '../../cache/question-skill.cache';
import { ISkillExpanderService } from '../../contracts/i-skill-expander-service.contract';
import {
  SkillExpansionPromptFactory,
  SkillExpansionPromptVersion,
} from '../../prompts/skill-expansion';
import {
  SkillExpansionSchema,
  SkillExpansionV2Schema,
} from '../../schemas/skill-expansion.schema';
import {
  TSkillExpansion,
  TSkillExpansionV2,
} from '../../types/skill-expansion.type';

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

  async expandSkills(
    question: string,
    promptVersion: SkillExpansionPromptVersion,
  ): Promise<TSkillExpansion> {
    if (this.useCache) {
      const cached = this.cache.lookup(question);
      if (cached) {
        this.logger.log(`Cache hit for question: "${question}"`);
        return cached;
      }
    }

    // Generate prompts based on the version
    const { getPrompts } = SkillExpansionPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(promptVersion);
    const userPrompt = getUserPrompt(question);

    const {
      object: { skills },
    } = await this.llmProviderClient.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema: SkillExpansionSchema,
      model: this.modelName,
    });

    const result: TSkillExpansion = {
      skillItems: skills,
    };
    if (this.useCache) {
      this.cache.store(question, result);
    }
    return result;
  }

  async expandSkillsV2(
    question: string,
    promptVersion: SkillExpansionPromptVersion,
  ): Promise<TSkillExpansionV2> {
    const { getPrompts } = SkillExpansionPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(promptVersion);

    const userPrompt = getUserPrompt(question);

    const { object } = await this.llmProviderClient.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema: SkillExpansionV2Schema,
      model: this.modelName,
    });
    const result: TSkillExpansionV2 = {
      skillItems: object.skills.map((item) => ({
        skill: item.skill,
        learningOutcome: item.learning_outcome,
        reason: item.reason,
      })),
    };
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
