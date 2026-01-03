import { Inject, Injectable, Logger } from '@nestjs/common';

import { LlmInfo } from 'src/shared/domain/types/llm-info.type';
import { TokenUsage } from 'src/shared/domain/types/token-usage.type';
import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/infrastructure/llm/contracts/i-llm-router-service.contract';

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

    const {
      object: { skills },
      inputTokens,
      outputTokens,
    } = await this.llmRouter.generateObject({
      prompt: userPrompt,
      systemPrompt,
      schema: SkillExpansionSchema,
      model: this.modelName,
    });

    const tokenUsage: TokenUsage = {
      model: this.modelName,
      inputTokens,
      outputTokens,
    };

    const llmInfo: LlmInfo = {
      model: this.modelName,
      userPrompt,
      systemPrompt,
      promptVersion,
    };

    const result: TSkillExpansion = {
      skillItems: skills,
      llmInfo,
      tokenUsage,
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

    const { object, inputTokens, outputTokens } =
      await this.llmRouter.generateObject({
        prompt: userPrompt,
        systemPrompt,
        schema: SkillExpansionV2Schema,
        model: this.modelName,
      });

    const tokenUsage: TokenUsage = {
      model: this.modelName,
      inputTokens,
      outputTokens,
    };

    const llmInfo: LlmInfo = {
      model: this.modelName,
      userPrompt,
      systemPrompt,
      promptVersion,
    };

    const result: TSkillExpansionV2 = {
      skillItems: object.skills.map((item) => ({
        skill: item.skill,
        learningOutcome: item.learning_outcome,
        reason: item.reason,
      })),
      llmInfo,
      tokenUsage,
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
