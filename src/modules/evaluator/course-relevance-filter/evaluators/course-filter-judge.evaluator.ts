import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';

import {
  BINARY_JUDGE_SYSTEM_PROMPT,
  getBinaryJudgeUserPrompt,
} from '../prompts/course-filter-judge.prompt';
import type { LlmJudgeCourseVerdict } from '../schemas/schema';
import { getJudgeEvaluationResultSchema } from '../schemas/schema';
import type {
  JudgeEvaluationInput,
  JudgeEvaluationResult,
} from '../types/course-relevance-filter.types';

// ============================================================================
// COURSE FILTER JUDGE EVALUATOR SERVICE
// ============================================================================

/**
 * Binary 1-axis utility judge evaluator for course relevance.
 *
 * Evaluates whether courses are useful (PASS) or noise (FAIL) based on
 * direct utility to the user's question.
 *
 * This is the "judge" in LLM-as-a-Judge evaluation methodology.
 * It operates without access to system scores, extracted skills, or system reasoning.
 */
@Injectable()
export class CourseFilterJudgeEvaluator {
  private readonly logger = new Logger(CourseFilterJudgeEvaluator.name);

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouterService: ILlmRouterService,
  ) {}

  /**
   * Evaluate courses for a user question using binary LLM judge.
   *
   * @param input - Question + courses to evaluate
   * @returns Judge verdicts (PASS/FAIL) with reasoning
   */
  async evaluate(input: JudgeEvaluationInput): Promise<JudgeEvaluationResult> {
    const { question, courses } = input;

    this.logger.log(
      `Evaluating ${courses.length} courses for question: "${question}"`,
    );

    // Build prompts
    const userPrompt = this.buildUserPrompt(question, courses);
    const systemPrompt = BINARY_JUDGE_SYSTEM_PROMPT;

    // Define schema for validation
    const schema = getJudgeEvaluationResultSchema(
      courses.length,
      courses.length,
    );

    // Call LLM with schema validation
    const llmResult = await this.llmRouterService.generateObject({
      prompt: userPrompt,
      systemPrompt,
      model: 'gpt-4.1-mini', // Default judge model
      schema,
      timeout: 60_000, // 60 second timeout
    });

    // Validate and type-narrow the LLM response
    const validatedVerdicts: LlmJudgeCourseVerdict[] =
      llmResult.object.courses.map((item) =>
        schema.shape.courses.element.parse(item),
      );

    this.logger.debug(
      `Judge evaluation complete: ${validatedVerdicts.length} verdicts returned`,
    );

    return {
      courses: validatedVerdicts.map((v) => ({
        code: v.code,
        verdict: v.verdict,
        reason: v.reason,
      })),
    };
  }

  /**
   * Build user prompt from question and courses.
   *
   * Converts courses array to JSON string for the prompt.
   *
   * @param question - User's question
   * @param courses - Courses to evaluate
   * @returns Formatted user prompt string
   */
  private buildUserPrompt(
    question: string,
    courses: JudgeEvaluationInput['courses'],
  ): string {
    const coursesData = JSON.stringify(
      courses.map((c) => ({
        code: c.code,
        name: c.name,
        outcomes: c.outcomes,
      })),
      null,
      2,
    );

    return getBinaryJudgeUserPrompt(question, coursesData);
  }
}
