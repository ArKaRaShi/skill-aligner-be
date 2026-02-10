import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';
import { ArrayHelper } from 'src/shared/utils/array.helper';
import type { Batch } from 'src/shared/utils/array.helper';

import { DEFAULT_JUDGE_TIMEOUT_MS } from '../../shared/configs';
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

/** Default batch size for course evaluation (courses per LLM call) */
const DEFAULT_BATCH_SIZE = 10;

/** Default concurrency limit for parallel batch execution */
const DEFAULT_CONCURRENCY = 2;

/**
 * Binary 1-axis utility judge evaluator for course relevance.
 *
 * Evaluates whether courses are useful (PASS) or noise (FAIL) based on
 * direct utility to the user's question.
 *
 * This is the "judge" in LLM-as-a-Judge evaluation methodology.
 * It operates without access to system scores, extracted skills, or system reasoning.
 *
 * BATCHING: Courses are evaluated in fixed-size batches to:
 * - Avoid context window limits
 * - Improve judgment quality (smaller batches = more focused)
 * - Enable progress tracking at batch level for crash recovery
 */
@Injectable()
export class CourseFilterJudgeEvaluator {
  private readonly logger = new Logger(CourseFilterJudgeEvaluator.name);
  private readonly batchSize = DEFAULT_BATCH_SIZE;
  private readonly concurrency = DEFAULT_CONCURRENCY;

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouterService: ILlmRouterService,
  ) {}

  /**
   * Evaluate courses for a user question using binary LLM judge.
   *
   * Courses are evaluated in fixed-size batches (default: 10 per call).
   * Batches run in parallel with a concurrency limit (default: 2).
   * Results are accumulated and returned together for atomic progress updates.
   *
   * @param input - Question + courses to evaluate
   * @returns Judge verdicts (PASS/FAIL) with reasoning and token usage
   */
  async evaluate(input: JudgeEvaluationInput): Promise<JudgeEvaluationResult> {
    const { question, courses } = input;

    this.logger.log(
      `Evaluating ${courses.length} courses for question: "${question}"`,
    );

    // Use ArrayHelper.chunk to split courses into batches
    const batches = ArrayHelper.chunk(courses, this.batchSize);

    this.logger.debug(
      `Processing ${batches.length} batch(es) with concurrency ${this.concurrency}`,
    );

    // Process batches in parallel with concurrency limit
    const { verdicts, tokenUsage } = await this.processBatchesWithConcurrency(
      question,
      batches,
    );

    this.logger.debug(
      `Judge evaluation complete: ${verdicts.length} verdicts, ${tokenUsage.length} token usage entries from ${batches.length} batch(es)`,
    );

    return {
      courses: verdicts.map((v) => ({
        code: v.code,
        verdict: v.verdict,
        reason: v.reason,
      })),
      tokenUsage,
    };
  }

  /**
   * Process multiple batches in parallel with a concurrency limit.
   *
   * @param question - User's question
   * @param batches - Array of batches with metadata
   * @returns Verdicts and accumulated token usage
   */
  private async processBatchesWithConcurrency(
    question: string,
    batches: Batch<JudgeEvaluationInput['courses'][0]>[],
  ): Promise<{ verdicts: LlmJudgeCourseVerdict[]; tokenUsage: TokenUsage[] }> {
    const verdictResults: LlmJudgeCourseVerdict[][] = [];
    const tokenResults: TokenUsage[] = [];
    const totalBatches = batches.length;

    // Process batches with concurrency limit
    for (let i = 0; i < batches.length; i += this.concurrency) {
      const concurrentBatches = batches.slice(i, i + this.concurrency);

      this.logger.debug(
        `Starting batches ${concurrentBatches[0].batchNumber}-${concurrentBatches[concurrentBatches.length - 1].batchNumber}/${totalBatches}`,
      );

      // Run concurrent batches in parallel
      const batchResults = await Promise.all(
        concurrentBatches.map(({ batchNumber, totalBatches, items: courses }) =>
          this.evaluateBatch(question, courses, batchNumber, totalBatches),
        ),
      );

      verdictResults.push(...batchResults.map((r) => r.verdicts));
      tokenResults.push(...batchResults.map((r) => r.tokenUsage));
    }

    // Flatten results
    return {
      verdicts: verdictResults.flat(),
      tokenUsage: tokenResults,
    };
  }

  /**
   * Evaluate a single batch of courses.
   *
   * @param question - User's question
   * @param courses - Batch of courses to evaluate
   * @param batchNumber - Current batch number (1-indexed)
   * @param totalBatches - Total number of batches
   * @returns Judge verdicts and token usage for this batch
   */
  private async evaluateBatch(
    question: string,
    courses: JudgeEvaluationInput['courses'],
    batchNumber: number,
    totalBatches: number,
  ): Promise<{ verdicts: LlmJudgeCourseVerdict[]; tokenUsage: TokenUsage }> {
    this.logger.debug(
      `Processing batch ${batchNumber}/${totalBatches} (${courses.length} courses)`,
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
      timeout: DEFAULT_JUDGE_TIMEOUT_MS,
    });

    // Validate and type-narrow the LLM response
    const validatedVerdicts: LlmJudgeCourseVerdict[] =
      llmResult.object.courses.map((item) =>
        schema.shape.courses.element.parse(item),
      );

    // Extract token usage
    const tokenUsage: TokenUsage = {
      model: llmResult.model,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
    };

    this.logger.debug(
      `Batch ${batchNumber}/${totalBatches} complete: ${validatedVerdicts.length} verdicts, ${llmResult.inputTokens + llmResult.outputTokens} tokens`,
    );

    return { verdicts: validatedVerdicts, tokenUsage };
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
