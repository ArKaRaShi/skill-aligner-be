import { Injectable, Logger } from '@nestjs/common';

import type { TokenUsage } from 'src/shared/contracts/types/token-usage.type';

import type {
  AnswerSynthesisContextSet,
  AnswerSynthesisTestCase,
  AnswerSynthesisTestSet,
} from '../types/answer-synthesis.types';

// ============================================================================
// ANSWER SYNTHESIS TEST SET TRANSFORMER SERVICE
// ============================================================================

/**
 * Test Set Transformer Service
 *
 * Transforms and merges answer synthesis test sets with course aggregation context.
 *
 * The transformer:
 * 1. Loads answer synthesis test set (question + answer)
 * 2. Loads course aggregation test set (ranked courses context)
 * 3. Merges by queryLogId to create evaluation-ready test cases
 *
 * This is necessary because the judge needs both:
 * - The question and answer (from answer synthesis step)
 * - The course context (from aggregation step)
 *
 * @example
 * ```ts
 * const transformer = new AnswerSynthesisTestSetTransformer();
 * const testCases = await transformer.transformToTestCases(answerSet, contextSet);
 * // testCases: AnswerSynthesisTestCase[] (enriched with context)
 * ```
 */
@Injectable()
export class AnswerSynthesisTestSetTransformer {
  private readonly logger = new Logger(AnswerSynthesisTestSetTransformer.name);

  /**
   * Transform answer synthesis and context sets into evaluation test cases.
   *
   * Merges the two data sources by queryLogId:
   * - Answer synthesis set provides: question, answer, llm metadata
   * - Context set provides: rankedCourses (AggregatedCourseSkills[])
   *
   * @param answerSynthesisSet - Answer synthesis test set
   * @param contextSet - Course aggregation context set
   * @returns Transformed test cases with enriched context
   */
  transformToTestCases(
    answerSynthesisSet: AnswerSynthesisTestSet[],
    contextSet: AnswerSynthesisContextSet[],
  ): AnswerSynthesisTestCase[] {
    this.logger.log(
      `Transforming ${answerSynthesisSet.length} answer synthesis entries with ${contextSet.length} context entries`,
    );

    // Create context map for efficient lookup
    const contextByQueryId = new Map<string, AnswerSynthesisContextSet>();
    for (const context of contextSet) {
      contextByQueryId.set(context.queryLogId, context);
    }

    const results: AnswerSynthesisTestCase[] = [];
    const missingContext: string[] = [];

    for (const answerEntry of answerSynthesisSet) {
      const context = contextByQueryId.get(answerEntry.queryLogId);

      if (!context) {
        this.logger.warn(
          `No context found for queryLogId="${answerEntry.queryLogId}"`,
        );
        missingContext.push(answerEntry.queryLogId);
        continue;
      }

      // Transform tokenUsage format to match TokenUsage type
      const transformedTokenUsage = answerEntry.tokenUsage
        ? ({
            model: answerEntry.llmModel ?? 'unknown',
            inputTokens: answerEntry.tokenUsage.input,
            outputTokens: answerEntry.tokenUsage.output,
          } satisfies TokenUsage)
        : undefined;

      // Create test case with enriched context
      const testCase: AnswerSynthesisTestCase = {
        queryLogId: answerEntry.queryLogId,
        question: answerEntry.question,
        answer: answerEntry.answer,
        context: context.rankedCourses, // Ranked courses from aggregation
        llmModel: answerEntry.llmModel,
        llmProvider: answerEntry.llmProvider,
        promptVersion: answerEntry.promptVersion,
        duration: answerEntry.duration,
        tokenUsage: transformedTokenUsage,
      };

      results.push(testCase);

      this.logger.debug(
        `Transformed entry ${answerEntry.queryLogId}: ${context.rankedCourses.length} courses in context`,
      );
    }

    if (missingContext.length > 0) {
      this.logger.warn(
        `Missing context for ${missingContext.length} entries: ${missingContext.join(', ')}`,
      );
    }

    this.logger.log(
      `Transformation complete: ${results.length} test cases created`,
    );

    return results;
  }

  /**
   * Transform a single answer synthesis entry with context.
   *
   * Useful for incremental processing or single-item evaluation.
   *
   * @param answerEntry - Single answer synthesis entry
   * @param contextEntry - Corresponding context entry
   * @returns Transformed test case
   */
  transformSingleEntry(
    answerEntry: AnswerSynthesisTestSet,
    contextEntry: AnswerSynthesisContextSet,
  ): AnswerSynthesisTestCase {
    if (answerEntry.queryLogId !== contextEntry.queryLogId) {
      throw new Error(
        `QueryLogId mismatch: answer="${answerEntry.queryLogId}" vs context="${contextEntry.queryLogId}"`,
      );
    }

    // Transform tokenUsage format to match TokenUsage type
    const transformedTokenUsage = answerEntry.tokenUsage
      ? ({
          model: answerEntry.llmModel ?? 'unknown',
          inputTokens: answerEntry.tokenUsage.input,
          outputTokens: answerEntry.tokenUsage.output,
        } satisfies TokenUsage)
      : undefined;

    return {
      queryLogId: answerEntry.queryLogId,
      question: answerEntry.question,
      answer: answerEntry.answer,
      context: contextEntry.rankedCourses,
      llmModel: answerEntry.llmModel,
      llmProvider: answerEntry.llmProvider,
      promptVersion: answerEntry.promptVersion,
      duration: answerEntry.duration,
      tokenUsage: transformedTokenUsage,
    };
  }
}
