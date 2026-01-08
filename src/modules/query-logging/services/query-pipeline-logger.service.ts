import type { CourseWithLearningOutcomeV2Match } from 'src/modules/course/types/course.type';
import type { QueryProfile } from 'src/modules/query-processor/types/query-profile.type';

import type { EmbeddingUsage } from '../../../shared/contracts/types/embedding-usage.type';
import type { Identifier } from '../../../shared/contracts/types/identifier';
import type { LlmInfo } from '../../../shared/contracts/types/llm-info.type';
import { HashHelper } from '../../../shared/utils/hash.helper';
import { TokenCostCalculator } from '../../../shared/utils/token-cost-calculator.helper';
import type {
  AggregatedCourseSkills,
  CourseWithLearningOutcomeV2MatchWithRelevance,
} from '../../query-processor/types/course-aggregation.type';
import type { CourseRelevanceFilterResultV2 } from '../../query-processor/types/course-relevance-filter.type';
import type { IQueryLoggingRepository } from '../contracts/i-query-logging-repository.contract';
import { QueryPipelineMetrics } from '../helpers/query-pipeline-metrics.helper';
import { SerializationHelper } from '../helpers/serialization.helper';
import type { StepEmbeddingConfig } from '../types/query-embedding-config.type';
import type { StepLlmConfig } from '../types/query-llm-config.type';
import type {
  CourseAggregationStepOutput,
  CourseFilterStepOutput,
  QueryProcessLogWithSteps,
} from '../types/query-log-step.type';
import type {
  QueryLogError,
  QueryLogInput,
  QueryLogMetrics,
  QueryLogOutput,
} from '../types/query-log.type';
import type { StepName } from '../types/query-status.type';

/**
 * Query Pipeline Logger Service
 *
 * Provides a clean, domain-specific API for logging query processing steps.
 * Encapsulates step names, ordering, and data transformation logic.
 *
 * Injects repository directly - no intermediate service layer.
 */
export class QueryPipelineLoggerService {
  private queryLogId?: Identifier;

  constructor(private readonly repository: IQueryLoggingRepository) {}

  /**
   * Start a new query log.
   * @param question - The user's question
   * @param input - Optional input parameters
   * @returns The query log ID
   */
  async start(question: string, input?: QueryLogInput): Promise<Identifier> {
    const log = await this.repository.createQueryLog({ question, input });
    this.queryLogId = log.id;
    return this.queryLogId;
  }

  /**
   * Complete a query log with final results.
   * @param output - Final output (answer, courses)
   * @param metrics - Aggregated metrics (duration, tokens, cost, counts)
   */
  async complete(
    output: QueryLogOutput,
    metrics?: Partial<QueryLogMetrics>,
  ): Promise<void> {
    const queryLogId = this.ensureQueryLogExists();
    await this.repository.updateQueryLog(queryLogId, {
      status: 'COMPLETED',
      completedAt: new Date(),
      output,
      metrics,
    });
  }

  /**
   * Early exit for irrelevant/dangerous questions.
   * @param output - Classification output (category, reason)
   * @param metrics - Optional metrics including totalDuration
   */
  async earlyExit(
    output: QueryLogOutput,
    metrics?: Partial<QueryLogMetrics>,
  ): Promise<void> {
    const queryLogId = this.ensureQueryLogExists();
    await this.repository.updateQueryLog(queryLogId, {
      status: 'EARLY_EXIT',
      completedAt: new Date(),
      output,
      metrics,
    });
  }

  /**
   * Mark a query log as failed.
   * @param error - Error information
   */
  async fail(error: QueryLogError): Promise<void> {
    const queryLogId = this.ensureQueryLogExists();
    await this.repository.updateQueryLog(queryLogId, {
      status: 'FAILED',
      completedAt: new Date(),
      error,
    });
  }

  /**
   * QUESTION_CLASSIFICATION step (order: 1).
   * Stores raw classification output only (no metrics needed).
   */
  async classification(data: {
    question: string;
    promptVersion: string;
    classificationResult: {
      category: string;
      reason: string;
      llmInfo: LlmInfo;
    };
    duration?: number;
  }): Promise<void> {
    const input = {
      question: data.question,
      promptVersion: data.promptVersion,
    };

    // Store only raw output (no metrics needed for simple step)
    const output = {
      raw: {
        category: data.classificationResult.category,
        reason: data.classificationResult.reason,
      },
    };

    await this.logStep(
      'QUESTION_CLASSIFICATION',
      1,
      input,
      output,
      data.classificationResult.llmInfo,
      undefined,
      data.duration,
    );
  }

  /**
   * QUERY_PROFILE_BUILDING step (order: 2).
   * Stores raw query profile output only (no metrics needed).
   */
  async queryProfile(data: {
    question: string;
    queryProfileResult: QueryProfile;
    duration?: number;
  }): Promise<void> {
    const input = { question: data.question };

    // Store only raw output (core data only, no llmInfo/tokenUsage)
    const output = {
      raw: {
        intents: data.queryProfileResult.intents,
        preferences: data.queryProfileResult.preferences,
        background: data.queryProfileResult.background,
        language: data.queryProfileResult.language,
      },
    };

    await this.logStep(
      'QUERY_PROFILE_BUILDING',
      2,
      input,
      output,
      data.queryProfileResult.llmInfo,
      undefined,
      data.duration,
    );
  }

  /**
   * SKILL_EXPANSION step (order: 3).
   * Stores raw skill expansion output only (no metrics needed).
   */
  async skillExpansion(data: {
    question: string;
    promptVersion: string;
    skillExpansionResult: {
      skillItems: Array<{ skill: string; reason: string }>;
      llmInfo: LlmInfo;
    };
    duration?: number;
  }): Promise<void> {
    const input = {
      question: data.question,
      promptVersion: data.promptVersion,
    };

    // Store only raw output (no metrics needed for simple step)
    const output = {
      raw: {
        skillItems: data.skillExpansionResult.skillItems,
      },
    };

    await this.logStep(
      'SKILL_EXPANSION',
      3,
      input,
      output,
      data.skillExpansionResult.llmInfo,
      undefined,
      data.duration,
    );
  }

  /**
   * COURSE_RETRIEVAL step (order: 4).
   * Stores raw skill courses map only (no metrics needed).
   */
  async courseRetrieval(data: {
    skills: string[];
    skillCoursesMap: Map<string, CourseWithLearningOutcomeV2Match[]>;
    embeddingUsage?: EmbeddingUsage;
    duration?: number;
  }): Promise<void> {
    const input = {
      skills: data.skills,
      threshold: 0,
      topN: 10,
    };

    // Store only raw output (no metrics needed for simple step)
    const output = {
      raw: {
        skills: data.skills,
        skillCoursesMap: SerializationHelper.serializeMap(data.skillCoursesMap), // <-- Serialize Map to Object
        embeddingUsage: data.embeddingUsage,
      },
    };

    await this.logStep(
      'COURSE_RETRIEVAL',
      4,
      input,
      output,
      undefined,
      data.embeddingUsage,
      data.duration,
    );
  }

  /**
   * COURSE_RELEVANCE_FILTER step (order: 5).
   * Stores BOTH raw filter result AND calculated metrics.
   */
  async courseFilter(data: {
    question: string;
    relevanceFilterResults: CourseRelevanceFilterResultV2[];
    duration?: number;
  }): Promise<void> {
    // Iterate through each filter result
    for (const filterResult of data.relevanceFilterResults) {
      // Serialize Maps to Objects for JSONB storage
      const serializedResult =
        SerializationHelper.serializeCourseFilterResult(filterResult);

      // Collect all unique skills from ALL three Maps (accepted, rejected, missing)
      const allSkills = new Set<string>();
      for (const skill of filterResult.llmAcceptedCoursesBySkill.keys()) {
        allSkills.add(skill);
      }
      for (const skill of filterResult.llmRejectedCoursesBySkill.keys()) {
        allSkills.add(skill);
      }
      for (const skill of filterResult.llmMissingCoursesBySkill.keys()) {
        allSkills.add(skill);
      }

      // If no skills found in any Map, still log the result (LLM was called but returned empty)
      if (allSkills.size === 0) {
        // Log with minimal info to show the filter step was executed
        await this.logStep(
          'COURSE_RELEVANCE_FILTER',
          5,
          { question: data.question, skills: [] },
          { raw: serializedResult, metrics: undefined },
          filterResult.llmInfo,
          undefined,
          data.duration,
        );
        continue;
      }

      // For each skill in the result, create a log record
      for (const skill of allSkills) {
        // Build input object
        const input = { skill, question: data.question };

        // Calculate metrics using helper
        const metrics: CourseFilterStepOutput =
          QueryPipelineMetrics.calculateSkillFilterMetrics(skill, filterResult);

        // Store BOTH raw (serialized) and metrics
        const output = {
          raw: serializedResult, // <-- Now with Objects instead of Maps
          metrics,
        };

        // Log one record per skill with raw + metrics
        await this.logStep(
          'COURSE_RELEVANCE_FILTER',
          5,
          input,
          output,
          filterResult.llmInfo,
          undefined,
          data.duration,
        );
      }
    }
  }

  /**
   * COURSE_AGGREGATION step (order: 6).
   * Stores BOTH raw aggregation data AND calculated metrics.
   */
  async courseAggregation(data: {
    filteredSkillCoursesMap: Map<
      string,
      CourseWithLearningOutcomeV2MatchWithRelevance[]
    >;
    rankedCourses: AggregatedCourseSkills[];
    duration?: number;
  }): Promise<void> {
    // Build input object
    const input = {
      skillCount: data.filteredSkillCoursesMap.size,
      rawCourseCount: Array.from(data.filteredSkillCoursesMap.values()).reduce(
        (sum, courses) => sum + courses.length,
        0,
      ),
    };

    // Calculate metrics using helper
    const metrics: CourseAggregationStepOutput =
      QueryPipelineMetrics.calculateAggregationMetrics(
        data.filteredSkillCoursesMap,
        data.rankedCourses,
      );

    // Store BOTH raw and metrics
    const output = {
      raw: {
        filteredSkillCoursesMap: SerializationHelper.serializeMap(
          data.filteredSkillCoursesMap,
        ), // <-- Serialize Map to Object
        rankedCourses: data.rankedCourses,
      },
      metrics,
    };

    // Log the step with raw + metrics
    await this.logStep(
      'COURSE_AGGREGATION',
      6,
      input,
      output,
      undefined,
      undefined,
      data.duration,
    );
  }

  /**
   * ANSWER_SYNTHESIS step (order: 7).
   * Stores raw synthesis output only (no metrics needed).
   */
  async answerSynthesis(data: {
    question: string;
    promptVersion: string;
    synthesisResult: {
      answerText: string;
      llmInfo: LlmInfo;
    };
    duration?: number;
  }): Promise<void> {
    const input = {
      question: data.question,
      promptVersion: data.promptVersion,
    };

    // Store only raw output (no metrics needed for simple step)
    const output = {
      raw: {
        answer: data.synthesisResult.answerText,
      },
    };

    await this.logStep(
      'ANSWER_SYNTHESIS',
      7,
      input,
      output,
      data.synthesisResult.llmInfo,
      undefined,
      data.duration,
    );
  }

  /**
   * Get the full query log with all steps.
   * @returns Query log with steps, or null if not found
   */
  async getFullLog(): Promise<QueryProcessLogWithSteps | null> {
    const queryLogId = this.ensureQueryLogExists();
    const log = await this.repository.findQueryLogById(queryLogId, true);
    return log as QueryProcessLogWithSteps | null;
  }

  /**
   * Get the last query log.
   * @returns Most recent query log with steps, or null if none exist
   */
  static async getLastLog(
    repository: IQueryLoggingRepository,
  ): Promise<QueryProcessLogWithSteps | null> {
    const log = await repository.findLastQueryLog(true);
    return log as QueryProcessLogWithSteps | null;
  }

  /**
   * Log a step with completion data.
   * @private
   */
  private async logStep(
    stepName: StepName,
    stepOrder: number,
    input?: Record<string, any>,
    output?: Record<string, any>,
    llmInfo?: LlmInfo,
    embeddingUsage?: EmbeddingUsage,
    duration?: number,
  ): Promise<void> {
    const queryLogId = this.ensureQueryLogExists();

    // Create step
    const step = await this.repository.createStep({
      queryLogId,
      stepName,
      stepOrder,
      input: this.serializeOutput(input),
    });

    // Update step with completion data (duration passed from caller)
    await this.repository.updateStep(step.id, {
      completedAt: new Date(),
      duration,
      output: output ? this.serializeOutput(output) : undefined,
      llm: llmInfo ? this.extractLlmInfo(llmInfo) : undefined,
      embedding: embeddingUsage
        ? this.extractEmbeddingInfo(embeddingUsage)
        : undefined,
    });
  }

  /**
   * Serialize output by converting Map to Object for JSONB storage.
   * Handles nested Maps, Arrays, Dates, and plain objects recursively.
   * @private
   */

  private serializeOutput(data?: any): any {
    // Handle undefined/null
    if (data === undefined || data === null) return data;

    // Handle Map - convert to object and recursively process values
    if (data instanceof Map) {
      const obj: Record<string, any> = {};
      for (const [key, value] of data.entries()) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        obj[key] = this.serializeOutput(value);
      }
      return obj;
    }

    // Handle Array - recursively process elements but keep as array
    if (Array.isArray(data)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return data.map((item) => this.serializeOutput(item));
    }

    // Handle Date - convert to ISO string for JSONB storage
    if (data instanceof Date) {
      return data.toISOString();
    }

    // Handle plain object - recursively process values
    if (typeof data === 'object') {
      const serialized: Record<string, any> = {};
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      for (const [key, value] of Object.entries(data)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        serialized[key] = this.serializeOutput(value);
      }
      return serialized;
    }

    // Primitive value - return as-is
    return data;
  }

  /**
   * Extract LLM info from LlmInfo to StepLlmConfig format.
   * @private
   */

  private extractLlmInfo(llmInfo: LlmInfo): StepLlmConfig {
    // Calculate tokenUsage (if tokens available)
    const tokenUsage =
      llmInfo.inputTokens !== undefined && llmInfo.outputTokens !== undefined
        ? {
            input: llmInfo.inputTokens,
            output: llmInfo.outputTokens,
            total: llmInfo.inputTokens + llmInfo.outputTokens,
          }
        : undefined;

    // Calculate cost (if tokens available)
    const cost = tokenUsage
      ? TokenCostCalculator.estimateCost({
          inputTokens: tokenUsage.input,
          outputTokens: tokenUsage.output,
          model: llmInfo.model,
        }).estimatedCost
      : undefined;

    return {
      provider: llmInfo.provider,
      model: llmInfo.model,
      promptVersion: llmInfo.promptVersion,
      systemPromptHash: HashHelper.generateHashSHA256(llmInfo.systemPrompt),
      userPrompt: llmInfo.userPrompt,
      schemaName: llmInfo.schemaName,
      // schemaShape excluded - Zod schema objects contain non-serializable functions
      // Use schemaName for identifying the schema structure
      tokenUsage, // Populated if inputTokens/outputTokens available
      cost, // Calculated if tokens available
      fullMetadata: {
        finishReason: llmInfo.finishReason,
        warnings: llmInfo.warnings,
        providerMetadata: llmInfo.providerMetadata,
        response: llmInfo.response,
      },
      parameters: llmInfo.hyperParameters,
    };
  }

  /**
   * Extract embedding info from EmbeddingUsage to StepEmbeddingConfig format.
   * @private
   */
  private extractEmbeddingInfo(
    embeddingUsage: EmbeddingUsage,
  ): StepEmbeddingConfig {
    return {
      model: embeddingUsage.bySkill[0]?.model ?? '',
      provider: embeddingUsage.bySkill[0]?.provider ?? '',
      dimension: embeddingUsage.bySkill[0]?.dimension ?? 0,
      totalTokens: embeddingUsage.totalTokens,
      bySkill: embeddingUsage.bySkill,
      skillsCount: embeddingUsage.bySkill.length,
    };
  }

  /**
   * Ensure query log exists before performing operations.
   * @returns The query log ID
   * @throws Error if query log hasn't been started
   * @private
   */
  private ensureQueryLogExists(): Identifier {
    if (!this.queryLogId) {
      throw new Error(
        'QueryPipelineLoggerService must be started before performing operations',
      );
    }
    return this.queryLogId;
  }
}
