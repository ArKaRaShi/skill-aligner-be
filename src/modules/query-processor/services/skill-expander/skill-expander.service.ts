import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';
import { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

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
    });
    this.logger.log('[DEBUG] llmRouter.generateObject completed');

    const {
      object: { skills },
      inputTokens,
      outputTokens,
      provider,
      finishReason,
      warnings,
      providerMetadata,
      response,
      hyperParameters,
    } = result;

    const tokenUsage: TokenUsage = {
      model: this.modelName,
      inputTokens,
      outputTokens,
    };

    const llmInfo: LlmInfo = {
      model: this.modelName,
      provider,
      inputTokens,
      outputTokens,
      userPrompt,
      systemPrompt,
      promptVersion,
      schemaName: 'SkillExpansionSchema',
      // schemaShape excluded - Zod schema objects contain non-serializable functions
      finishReason,
      warnings,
      providerMetadata,
      response,
      hyperParameters,
    };

    const expansionResult: TSkillExpansion = {
      skillItems: skills,
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
    });

    const {
      object,
      inputTokens,
      outputTokens,
      provider,
      finishReason,
      warnings,
      providerMetadata,
      response,
      hyperParameters,
    } = result;

    const tokenUsage: TokenUsage = {
      model: this.modelName,
      inputTokens,
      outputTokens,
    };

    const llmInfo: LlmInfo = {
      model: this.modelName,
      provider,
      inputTokens,
      outputTokens,
      userPrompt,
      systemPrompt,
      promptVersion,
      schemaName: 'SkillExpansionV2Schema',
      // schemaShape excluded - Zod schema objects contain non-serializable functions
      finishReason,
      warnings,
      providerMetadata,
      response,
      hyperParameters,
    };

    const expansionResultV2: TSkillExpansionV2 = {
      skillItems: object.skills.map((item) => ({
        skill: item.skill,
        learningOutcome: item.learning_outcome,
        reason: item.reason,
      })),
      llmInfo,
      tokenUsage,
    };
    return expansionResultV2;
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
