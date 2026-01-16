import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { LlmMetadataBuilder } from 'src/shared/utils/llm-metadata.builder';

import { QuestionSkillCache } from '../../cache/question-skill.cache';
import { QueryPipelineConfig } from '../../constants/config.constant';
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
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouter: ILlmRouterService,
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

    this.logger.log('[DEBUG] Calling llmRouter.generateObject...');
    const result = await this.llmRouter.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema: SkillExpansionSchema,
      model: this.modelName,
      timeout: QueryPipelineConfig.LLM_STEP_TIMEOUTS.SKILL_EXPANSION,
    });
    this.logger.log('[DEBUG] llmRouter.generateObject completed');

    const { tokenUsage, llmInfo } = LlmMetadataBuilder.buildFromLlmResult(
      result,
      result.model,
      userPrompt,
      systemPrompt,
      promptVersion,
      'SkillExpansionSchema',
    );

    const expansionResult: TSkillExpansion = {
      skillItems: this.deduplicateSkills(result.object.skills),
      llmInfo,
      tokenUsage,
    };
    if (this.useCache) {
      this.cache.store(question, expansionResult);
    }
    return expansionResult;
  }

  async expandSkillsV2(
    question: string,
    promptVersion: SkillExpansionPromptVersion,
  ): Promise<TSkillExpansionV2> {
    const { getPrompts } = SkillExpansionPromptFactory();
    const { getUserPrompt, systemPrompt } = getPrompts(promptVersion);

    const userPrompt = getUserPrompt(question);

    const result = await this.llmRouter.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema: SkillExpansionV2Schema,
      model: this.modelName,
      timeout: QueryPipelineConfig.LLM_STEP_TIMEOUTS.SKILL_EXPANSION,
    });

    const { tokenUsage, llmInfo } = LlmMetadataBuilder.buildFromLlmResult(
      result,
      result.model,
      userPrompt,
      systemPrompt,
      promptVersion,
      'SkillExpansionV2Schema',
    );

    const expansionResultV2: TSkillExpansionV2 = {
      skillItems: this.deduplicateSkills(
        result.object.skills.map((item) => ({
          skill: item.skill,
          learningOutcome: item.learning_outcome,
          reason: item.reason,
        })),
      ),
      llmInfo,
      tokenUsage,
    };
    return expansionResultV2;
  }

  private deduplicateSkills<T extends { skill: string }>(skills: T[]): T[] {
    const seen = new Set<string>();
    const uniqueSkills: T[] = [];

    for (const skill of skills) {
      const skillKey = skill.skill.toLowerCase();
      if (!seen.has(skillKey)) {
        seen.add(skillKey);
        uniqueSkills.push(skill);
      }
    }

    return uniqueSkills;
  }
}
