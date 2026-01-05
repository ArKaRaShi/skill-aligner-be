import type { EmbeddingResultMetadata } from '../../../shared/adapters/embedding/providers/base-embedding-provider.abstract';
import type { Identifier } from '../../../shared/contracts/types/identifier';
import type { LlmInfo } from '../../../shared/contracts/types/llm-info.type';
import { HashHelper } from '../../../shared/utils/hash.helper';
import type { IQueryLoggingRepository } from '../contracts/i-query-logging-repository.contract';
import type {
  Skill,
  StepEmbeddingConfig,
} from '../types/query-embedding-config.type';
import type { StepLlmConfig } from '../types/query-llm-config.type';
import type { QueryProcessLogWithSteps } from '../types/query-log-step.type';
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
  private stepStartTimes = new Map<StepName, Date>();

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
   */
  async earlyExit(output: QueryLogOutput): Promise<void> {
    const queryLogId = this.ensureQueryLogExists();
    await this.repository.updateQueryLog(queryLogId, {
      status: 'EARLY_EXIT',
      completedAt: new Date(),
      output,
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
   */
  async classification(
    input?: Record<string, any>,
    output?: Record<string, any>,
    llmInfo?: LlmInfo,
  ): Promise<void> {
    await this.logStep('QUESTION_CLASSIFICATION', 1, input, output, llmInfo);
  }

  /**
   * QUERY_PROFILE_BUILDING step (order: 2).
   */
  async queryProfile(
    input?: Record<string, any>,
    output?: Record<string, any>,
    llmInfo?: LlmInfo,
  ): Promise<void> {
    await this.logStep('QUERY_PROFILE_BUILDING', 2, input, output, llmInfo);
  }

  /**
   * SKILL_EXPANSION step (order: 3).
   */
  async skillExpansion(
    input?: Record<string, any>,
    output?: Record<string, any>,
    llmInfo?: LlmInfo,
  ): Promise<void> {
    await this.logStep('SKILL_EXPANSION', 3, input, output, llmInfo);
  }

  /**
   * COURSE_RETRIEVAL step (order: 4).
   */
  async courseRetrieval(
    input?: Record<string, any>,
    output?: Record<string, any>,
    embeddingResult?: Map<Skill, EmbeddingResultMetadata>,
  ): Promise<void> {
    await this.logStep(
      'COURSE_RETRIEVAL',
      4,
      input,
      output,
      undefined,
      embeddingResult,
    );
  }

  /**
   * COURSE_RELEVANCE_FILTER step (order: 5).
   */
  async courseFilter(
    input?: Record<string, any>,
    output?: Record<string, any>,
    llmInfo?: LlmInfo,
  ): Promise<void> {
    await this.logStep('COURSE_RELEVANCE_FILTER', 5, input, output, llmInfo);
  }

  /**
   * ANSWER_SYNTHESIS step (order: 6).
   */
  async answerSynthesis(
    input?: Record<string, any>,
    output?: Record<string, any>,
    llmInfo?: LlmInfo,
  ): Promise<void> {
    await this.logStep('ANSWER_SYNTHESIS', 6, input, output, llmInfo);
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
   * Log a step with start/end timing and data.
   * @private
   */
  private async logStep(
    stepName: StepName,
    stepOrder: number,
    input?: Record<string, any>,
    output?: Record<string, any>,
    llmInfo?: LlmInfo,
    embeddingResult?: Map<Skill, EmbeddingResultMetadata>,
  ): Promise<void> {
    const queryLogId = this.ensureQueryLogExists();
    const startTime = new Date();

    // Create step
    const step = await this.repository.createStep({
      queryLogId,
      stepName,
      stepOrder,
      input: this.serializeOutput(input),
    });

    // Calculate duration
    const completedAt = new Date();
    const duration = completedAt.getTime() - startTime.getTime();

    // Update step with completion data
    await this.repository.updateStep(step.id, {
      completedAt,
      duration,
      output: output ? this.serializeOutput(output) : undefined,
      llm: llmInfo ? this.extractLlmInfo(llmInfo) : undefined,
      embedding: embeddingResult
        ? this.extractEmbeddingInfo(embeddingResult)
        : undefined,
    });
  }

  /**
   * Serialize output by converting Map to Object for JSONB storage.
   * Handles nested Maps, Arrays, and plain objects recursively.
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
    return {
      provider: llmInfo.provider,
      model: llmInfo.model,
      promptVersion: llmInfo.promptVersion,
      systemPromptHash: HashHelper.generateHashSHA256(llmInfo.systemPrompt),
      userPrompt: llmInfo.userPrompt,
      schemaName: llmInfo.schemaName,
      schemaShape: llmInfo.schemaShape,
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
   * Extract embedding info from result to StepEmbeddingConfig format.
   * @private
   */

  private extractEmbeddingInfo(
    embeddingResult: Map<Skill, EmbeddingResultMetadata>,
  ): StepEmbeddingConfig {
    const entries = Array.from(embeddingResult.entries());

    return {
      model: entries[0]?.[1].model ?? '',
      provider: entries[0]?.[1].provider ?? '',
      dimension: entries[0]?.[1].dimension ?? 0,
      totalTokens: entries.reduce(
        (sum, [, metadata]) => sum + (metadata.totalTokens ?? 0),
        0,
      ),
      embeddingsUsage: new Map(
        entries.map(([skill, metadata]) => [
          skill,
          {
            model: metadata.model,
            provider: metadata.provider,
            dimension: metadata.dimension,
            embeddedText: metadata.embeddedText,
            generatedAt: metadata.generatedAt,
            promptTokens: metadata.promptTokens,
            totalTokens: metadata.totalTokens,
          },
        ]),
      ),
      skillsCount: embeddingResult.size,
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
