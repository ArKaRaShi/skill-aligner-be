import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { TokenCostCalculator } from 'src/shared/utils/token-cost-calculator.helper';

import { DEFAULT_JUDGE_TIMEOUT_MS } from '../../shared/configs';
import { IEvaluator } from '../../shared/contracts/i-evaluator.contract';
import { CourseRetrieverEvaluatorHelper } from '../helpers/course-retriever.evaluator.helper';
import {
  COURSE_RETRIEVER_JUDGE_SYSTEM_PROMPT,
  getCourseRetrieverJudgeUserPrompt,
} from '../prompts/course-retriever.judge.prompt';
import {
  CourseEvaluationItemSchema,
  getCourseRetrievalEvaluatorSchema,
  LlmCourseEvaluationItem,
} from '../schemas/schema';
import { CourseRetrievalMetricsCalculator } from '../services/course-retrieval-metrics-calculator.service';
import {
  CourseRetrieverEvaluatorInput,
  CourseRetrieverEvaluatorOutput,
} from '../types/course-retrieval.types';

/**
 * Course Retrieval Evaluator
 *
 * Evaluates the quality of course retrieval results using LLM-as-a-Judge.
 * Updated to use single-score relevance model (commit e9cfa11).
 *
 * Metrics calculated:
 * - Average relevance score (0-3)
 * - Score distribution (breakdown of scores 0-3)
 * - Highly relevant rate (percentage of score 3)
 * - Irrelevant rate (percentage of score 0)
 */
@Injectable()
export class CourseRetrieverEvaluator
  implements
    IEvaluator<CourseRetrieverEvaluatorInput, CourseRetrieverEvaluatorOutput>
{
  private readonly DEFAULT_MODEL_NAME: string;
  private readonly logger = new Logger(CourseRetrieverEvaluator.name);

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouterService: ILlmRouterService,
    @Optional() modelName: string = 'gpt-4.1-mini',
  ) {
    this.DEFAULT_MODEL_NAME = modelName;
  }

  async evaluate(
    input: CourseRetrieverEvaluatorInput,
    options?: {
      model?: string;
      provider?: string;
      timeout?: number;
    },
  ): Promise<CourseRetrieverEvaluatorOutput> {
    const { question, skill, retrievedCourses } = input;

    // Use options model/provider if provided, otherwise use defaults
    const model = options?.model ?? this.DEFAULT_MODEL_NAME;
    const provider = options?.provider; // Optional: let llmRouterService resolve if not specified

    // validate config
    if (model.trim() === '') {
      throw new Error(
        'CourseRetrieverEvaluator: MODEL_NAME is not configured.',
      );
    }

    this.logger.debug(
      `Using LLM model: ${model} for course retriever evaluation.`,
    );
    this.logger.log(
      `Evaluating course retriever for question: "${question}" with skill: "${skill}" and ${retrievedCourses.length} retrieved courses.`,
    );

    // build prompts
    const userPrompt = getCourseRetrieverJudgeUserPrompt(
      question,
      skill,
      CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(
        retrievedCourses,
      ),
    );
    const systemPrompt = COURSE_RETRIEVER_JUDGE_SYSTEM_PROMPT;

    // define schema for evaluation
    const schema = getCourseRetrievalEvaluatorSchema(
      retrievedCourses.length,
      retrievedCourses.length,
    );

    const llmResult = await this.llmRouterService.generateObject({
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      model,
      provider,
      schema,
      timeout: options?.timeout ?? DEFAULT_JUDGE_TIMEOUT_MS,
    });

    // Validate and type-narrow the LLM response
    const validatedEvaluations: LlmCourseEvaluationItem[] =
      llmResult.object.evaluations.map(
        (item) =>
          CourseEvaluationItemSchema.parse(item) as LlmCourseEvaluationItem,
      );

    // Map LLM evaluations to internal format and calculate metrics
    const evaluations = CourseRetrievalMetricsCalculator.mapEvaluations(
      validatedEvaluations,
      retrievedCourses,
    );
    const metrics =
      CourseRetrievalMetricsCalculator.calculateMetrics(evaluations);
    const llmCostEstimateSummary = TokenCostCalculator.estimateTotalCost([
      {
        model: llmResult.model,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
      },
    ]);

    return {
      question,
      skill,
      evaluations,
      metrics,
      llmInfo: {
        model: llmResult.model,
        provider: llmResult.provider,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
        systemPrompt,
        userPrompt,
        promptVersion: '1.0',
        schemaName: 'CourseRetrieverEvaluator',
        finishReason: llmResult.finishReason,
        warnings: llmResult.warnings,
        providerMetadata: llmResult.providerMetadata,
        response: llmResult.response,
        hyperParameters: llmResult.hyperParameters,
      },
      llmTokenUsage: {
        model: llmResult.model,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
      },
      llmCostEstimateSummary,
    };
  }
}
