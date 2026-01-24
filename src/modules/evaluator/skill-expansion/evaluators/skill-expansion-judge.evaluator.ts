import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import {
  getSkillExpansionJudgeUserPrompt,
  SKILL_EXPANSION_JUDGE_SYSTEM_PROMPT,
} from '../prompts/skill-expansion-judge.prompt';
import {
  getJudgeOutputSchema,
  type SkillExpansionJudgeOutputSchema,
} from '../schemas/schema';
import type {
  SkillExpansionJudgeInput,
  SkillExpansionJudgeResult,
} from '../types/skill-expansion.types';

// ============================================================================
// SKILL EXPANSION JUDGE EVALUATOR SERVICE
// ============================================================================

/** Default timeout for LLM calls */
const DEFAULT_TIMEOUT = 60_000; // 60 seconds

/**
 * LLM-as-a-Judge evaluator for skill expansion quality.
 *
 * Evaluates whether extracted skills are:
 * - Relevant to the user's question
 * - Teachable in university context
 * - High quality (conceptual, not procedural)
 * - Complete (preserves user concepts)
 *
 * This is the "judge" in LLM-as-a-Judge evaluation methodology.
 * It operates independently of the SkillExpanderService.
 *
 * EVALUATION MODEL:
 * - One question + all its skills = One LLM call
 * - No batching - simpler and better context for judge
 * - Judge can assess concept preservation holistically across all skills
 */
@Injectable()
export class SkillExpansionJudgeEvaluator {
  private readonly logger = new Logger(SkillExpansionJudgeEvaluator.name);

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouterService: ILlmRouterService,
  ) {}

  /**
   * Evaluate skills for a user question using LLM judge.
   *
   * One question + all its skills are evaluated in a single LLM call.
   * The judge can holistically assess:
   * - Individual skill quality (relevance, teachability)
   * - Concept preservation (at least one skill preserves user's concept)
   * - Completeness (missing/redundant skills)
   *
   * @param input - Question + system skills to evaluate
   * @param options - Optional model configuration
   * @returns Judge verdicts with scores, issues, and token usage
   */
  async evaluate(
    input: SkillExpansionJudgeInput,
    options?: {
      model?: string;
      provider?: string;
      timeout?: number;
    },
  ): Promise<SkillExpansionJudgeResult> {
    const { question, systemSkills } = input;

    this.logger.log(
      `Evaluating ${systemSkills.length} skills for question: "${question}"`,
    );

    // Build prompts
    const userPrompt = this.buildUserPrompt(question, systemSkills);
    const systemPrompt = SKILL_EXPANSION_JUDGE_SYSTEM_PROMPT;

    // Define schema for validation
    const schema = getJudgeOutputSchema(
      systemSkills.length,
      systemSkills.length,
    );

    // Call LLM with schema validation
    const llmResult = await this.llmRouterService.generateObject({
      prompt: userPrompt,
      systemPrompt,
      model: options?.model ?? 'gpt-4o-mini',
      provider: options?.provider,
      schema,
      timeout: options?.timeout ?? DEFAULT_TIMEOUT,
    });

    // Validate and type-narrow the LLM response
    const validatedResult: SkillExpansionJudgeOutputSchema = schema.parse(
      llmResult.object,
    );

    // Extract token usage
    const tokenUsage: TokenUsage = {
      model: llmResult.model,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
    };

    this.logger.debug(
      `Judge evaluation complete: ${validatedResult.skills.length} skill verdicts, ${llmResult.inputTokens + llmResult.outputTokens} tokens`,
    );

    return {
      result: validatedResult,
      tokenUsage: [tokenUsage],
    };
  }

  /**
   * Build user prompt from question and skills.
   *
   * Converts skills array to JSON string for the prompt.
   *
   * @param question - User's question
   * @param skills - Skills to evaluate
   * @returns Formatted user prompt string
   */
  private buildUserPrompt(
    question: string,
    skills: SkillExpansionJudgeInput['systemSkills'],
  ): string {
    const skillsData = JSON.stringify(
      skills.map((s) => ({
        skill: s.skill,
        reason: s.reason,
        learningOutcome: s.learningOutcome,
      })),
      null,
      2,
    );

    return getSkillExpansionJudgeUserPrompt(question, skillsData);
  }
}
