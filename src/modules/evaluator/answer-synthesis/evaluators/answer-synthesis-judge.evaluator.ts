import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import {
  ANSWER_SYNTHESIS_JUDGE_SYSTEM_PROMPT,
  getAnswerSynthesisJudgeUserPrompt,
} from '../prompts/answer-synthesis-judge.prompt';
import { AnswerSynthesisJudgeVerdictSchema } from '../schemas/schema';
import type {
  AnswerSynthesisJudgeResult,
  AnswerSynthesisTestCase,
} from '../types/answer-synthesis.types';

// ============================================================================
// ANSWER SYNTHESIS JUDGE EVALUATOR SERVICE
// ============================================================================

/**
 * LLM judge evaluator for answer synthesis quality.
 *
 * Evaluates the quality of generated answers on 4 dimensions:
 * 1. Question Addressal (0-3) - Does the answer address the question?
 * 2. Context Adherence (0-3) - Does it use ONLY provided context?
 * 3. Format Compliance (PASS/FAIL) - Follows formatting rules?
 * 4. Tone Consistency (PASS/FAIL) - Exploratory, non-prescriptive?
 *
 * This is the "judge" in LLM-as-a-Judge evaluation methodology for answer synthesis.
 * It operates with access to the question, course context, and system answer.
 */
@Injectable()
export class AnswerSynthesisJudgeEvaluator {
  private readonly logger = new Logger(AnswerSynthesisJudgeEvaluator.name);
  private readonly defaultJudgeModel = 'gpt-4o'; // Stronger model for judging
  private readonly defaultTimeout = 60_000; // 60 seconds

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouterService: ILlmRouterService,
  ) {}

  /**
   * Evaluate a single answer using LLM judge.
   *
   * @param testCase - Test case with question, context, and answer
   * @param model - Optional judge model (default: gpt-4o)
   * @returns Judge verdict with reasoning and token usage
   */
  async evaluate(
    testCase: AnswerSynthesisTestCase,
    model?: string,
  ): Promise<AnswerSynthesisJudgeResult> {
    const { question, context, answer } = testCase;
    const judgeModel = model ?? this.defaultJudgeModel;

    const QUESTION_PREVIEW_LENGTH = 50;
    this.logger.log(
      `Evaluating answer for question: "${question.substring(0, QUESTION_PREVIEW_LENGTH)}..." using model: ${judgeModel}`,
    );

    // Build prompts
    const userPrompt = getAnswerSynthesisJudgeUserPrompt(
      question,
      context,
      answer,
    );
    const systemPrompt = ANSWER_SYNTHESIS_JUDGE_SYSTEM_PROMPT;

    // Call LLM with schema validation
    const llmResult = await this.llmRouterService.generateObject({
      prompt: userPrompt,
      systemPrompt,
      model: judgeModel,
      schema: AnswerSynthesisJudgeVerdictSchema,
      timeout: this.defaultTimeout,
    });

    // Extract token usage
    const tokenUsage: TokenUsage = {
      model: llmResult.model,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
    };

    this.logger.debug(
      `Judge evaluation complete: ${llmResult.inputTokens + llmResult.outputTokens} tokens used`,
    );

    return {
      verdict: llmResult.object,
      tokenUsage: [tokenUsage],
    };
  }

  /**
   * Evaluate multiple answers in batch.
   *
   * Processes multiple test cases in parallel for efficiency.
   *
   * @param testCases - Array of test cases to evaluate
   * @param model - Optional judge model (default: gpt-4o)
   * @returns Array of judge results
   */
  async evaluateBatch(
    testCases: AnswerSynthesisTestCase[],
    model?: string,
  ): Promise<AnswerSynthesisJudgeResult[]> {
    this.logger.log(`Evaluating ${testCases.length} answers in batch...`);

    const results = await Promise.all(
      testCases.map((testCase) => this.evaluate(testCase, model)),
    );

    this.logger.log(`Batch evaluation complete: ${results.length} results`);

    return results;
  }
}
