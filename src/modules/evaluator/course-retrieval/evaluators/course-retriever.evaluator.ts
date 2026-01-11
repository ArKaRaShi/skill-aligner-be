import { Inject, Injectable, Logger, Optional } from '@nestjs/common';

import {
  I_LLM_ROUTER_SERVICE_TOKEN,
  ILlmRouterService,
} from 'src/shared/adapters/llm/contracts/i-llm-router-service.contract';
import { TokenCostCalculator } from 'src/shared/utils/token-cost-calculator.helper';

import { IEvaluator } from '../../shared/contracts/i-evaluator.contract';
import { CourseRetrieverEvaluatorHelper } from '../helpers/course-retriever.evaluator.helper';
import { MetricsCalculator } from '../metrics/metrics-calculator';
import {
  COURSE_RETRIEVER_EVALUATOR_SYSTEM_PROMPT,
  getCourseRetrieverEvaluatorUserPrompt,
} from '../prompts/course-retriever.evaluator.prompt';
import {
  CourseEvaluationItemSchema,
  getCourseRetrievalEvaluatorSchema,
  LlmCourseEvaluationItem,
} from '../schemas/schema';
import {
  CourseRetrieverEvaluatorInput,
  CourseRetrieverEvaluatorOutput,
} from '../types/course-retrieval.types';

@Injectable()
export class CourseRetrieverEvaluator
  implements
    IEvaluator<CourseRetrieverEvaluatorInput, CourseRetrieverEvaluatorOutput>
{
  private readonly MODEL_NAME: string;
  private readonly logger = new Logger(CourseRetrieverEvaluator.name);

  constructor(
    @Inject(I_LLM_ROUTER_SERVICE_TOKEN)
    private readonly llmRouterService: ILlmRouterService,
    @Optional() modelName: string = 'gpt-4.1-mini',
  ) {
    this.MODEL_NAME = modelName;
  }

  async evaluate(
    input: CourseRetrieverEvaluatorInput,
  ): Promise<CourseRetrieverEvaluatorOutput> {
    const { question, skill, retrievedCourses } = input;

    // validate config
    if (this.MODEL_NAME.trim() === '') {
      throw new Error(
        'CourseRetrieverEvaluator: MODEL_NAME is not configured.',
      );
    }

    this.logger.debug(
      `Using LLM model: ${this.MODEL_NAME} for course retriever evaluation.`,
    );
    this.logger.log(
      `Evaluating course retriever for question: "${question}" with skill: "${skill}" and ${retrievedCourses.length} retrieved courses.`,
    );

    // build prompts
    const userPrompt = getCourseRetrieverEvaluatorUserPrompt(
      question,
      skill,
      CourseRetrieverEvaluatorHelper.buildRetrievedCoursesContext(
        retrievedCourses,
      ),
    );
    const systemPrompt = COURSE_RETRIEVER_EVALUATOR_SYSTEM_PROMPT;

    // define schema for evaluation
    const schema = getCourseRetrievalEvaluatorSchema(
      retrievedCourses.length,
      retrievedCourses.length,
    );

    const llmResult = await this.llmRouterService.generateObject({
      prompt: userPrompt,
      systemPrompt: systemPrompt,
      model: this.MODEL_NAME,
      schema,
      timeout: 60_000, // 60 second timeout for course evaluation
    });

    // Validate and type-narrow the LLM response
    const validatedEvaluations: LlmCourseEvaluationItem[] =
      llmResult.object.evaluations.map(
        (item) =>
          CourseEvaluationItemSchema.parse(item) as LlmCourseEvaluationItem,
      );

    const evaluations = MetricsCalculator.mapEvaluations(validatedEvaluations);
    const metrics = MetricsCalculator.calculateMetrics(evaluations);
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
