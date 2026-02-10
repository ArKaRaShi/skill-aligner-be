import { Injectable, Logger } from '@nestjs/common';

import { QueryPipelineReaderService } from 'src/modules/query-logging/services/query-pipeline-reader.service';
import type { QueryProcessLogWithSteps } from 'src/modules/query-logging/types/query-log-step.type';
import type { QueryProcessLog } from 'src/modules/query-logging/types/query-log.type';
import { STEP_NAME } from 'src/modules/query-logging/types/query-status.type';

// ============================================================================
// ENRICHED LOG TYPES - Full step with all metadata
// ============================================================================

/**
 * Query log enriched with QUESTION_CLASSIFICATION step
 * Returns the full QueryProcessStep with all metadata
 */
export type QueryLogWithClassification = QueryProcessLog & {
  classificationStep: QueryProcessLogWithSteps['processSteps'][number];
};

/**
 * Query log enriched with SKILL_EXPANSION step
 * Returns the full QueryProcessStep with all metadata
 */
export type QueryLogWithSkillExpansion = QueryProcessLog & {
  skillExpansionStep: QueryProcessLogWithSteps['processSteps'][number];
};

/**
 * Query log enriched with COURSE_RETRIEVAL step
 * Returns the full QueryProcessStep with all metadata
 */
export type QueryLogWithCourseRetrieval = QueryProcessLog & {
  courseRetrievalStep: QueryProcessLogWithSteps['processSteps'][number];
};

/**
 * Query log enriched with COURSE_RELEVANCE_FILTER step
 * Returns the full QueryProcessStep with all metadata
 */
export type QueryLogWithCourseFilter = QueryProcessLog & {
  courseFilterStep: QueryProcessLogWithSteps['processSteps'][number];
};

/**
 * Query log enriched with COURSE_RELEVANCE_FILTER steps (grouped)
 * Groups all skills from one query log into a single entry
 */
export type QueryLogWithCourseFilterGrouped = QueryProcessLog & {
  courseFilterSteps: QueryProcessLogWithSteps['processSteps'][number][];
};

/**
 * Query log enriched with COURSE_AGGREGATION step
 * Returns the full QueryProcessStep with all metadata
 */
export type QueryLogWithAggregation = QueryProcessLog & {
  aggregationStep: QueryProcessLogWithSteps['processSteps'][number];
};

/**
 * Query log enriched with ANSWER_SYNTHESIS step
 * Returns the full QueryProcessStep with all metadata
 */
export type QueryLogWithAnswerSynthesis = QueryProcessLog & {
  answerSynthesisStep: QueryProcessLogWithSteps['processSteps'][number];
};

/**
 * Query Log Enrichment Transformer
 *
 * Transforms query logs into enriched logs with complete step data.
 * Returns full QueryProcessStep objects (id, raw, llm, embedding, duration, etc.)
 * for each step, making all metadata available for test set creation.
 *
 * Uses QueryPipelineReaderService for:
 * - Loading query logs from the database
 * - Parsing raw outputs back to proper types
 * - Reconstructing Maps from JSONB storage
 *
 * @example
 * ```ts
 * // Enrich logs with skill expansion step data
 * const enrichedLogs = await transformer.toSkillExpansionEnrichedLogs(ids);
 * // Each log contains: { ...log, skillExpansionStep: { id, raw, llm, duration, ... } }
 *
 * // Access raw output from the step (already parsed!)
 * const rawOutput = enrichedLogs[0].skillExpansionStep.output?.raw;
 *
 * // Access LLM metadata
 * const llmInfo = enrichedLogs[0].skillExpansionStep.llm;
 * ```
 */
@Injectable()
export class TestSetTransformer {
  private readonly logger = new Logger(TestSetTransformer.name);

  constructor(private readonly reader: QueryPipelineReaderService) {}

  // ==========================================================================
  // ENRICHMENT METHODS - Return full logs with step data
  // ==========================================================================

  /**
   * Enrich logs with SKILL_EXPANSION step data
   *
   * Returns full query logs with the complete SKILL_EXPANSION step.
   *
   * @example
   * ```ts
   * const enrichedLogs = await transformer.toSkillExpansionEnrichedLogs(ids);
   * // Returns: QueryLogWithSkillExpansion[]
   * // Each log has: { ...log, skillExpansionStep: { id, raw, llm, duration, ... } }
   * ```
   */
  async toSkillExpansionEnrichedLogs(
    queryLogIds: string[],
  ): Promise<QueryLogWithSkillExpansion[]> {
    this.logger.log(
      `Enriching ${queryLogIds.length} logs with SKILL_EXPANSION data`,
    );

    const logs = await this.reader.getQueryLogsByIds(queryLogIds);
    return logs.map((log) => this.enrichWithSkillExpansion(log));
  }

  /**
   * Enrich logs with QUESTION_CLASSIFICATION step data
   */
  async toClassificationEnrichedLogs(
    queryLogIds: string[],
  ): Promise<QueryLogWithClassification[]> {
    this.logger.log(
      `Enriching ${queryLogIds.length} logs with QUESTION_CLASSIFICATION data`,
    );

    const logs = await this.reader.getQueryLogsByIds(queryLogIds);
    return logs.map((log) => this.enrichWithClassification(log));
  }

  /**
   * Enrich logs with COURSE_RETRIEVAL step data
   */
  async toCourseRetrievalEnrichedLogs(
    queryLogIds: string[],
  ): Promise<QueryLogWithCourseRetrieval[]> {
    this.logger.log(
      `Enriching ${queryLogIds.length} logs with COURSE_RETRIEVAL data`,
    );

    const logs = await this.reader.getQueryLogsByIds(queryLogIds);
    return logs.map((log) => this.enrichWithCourseRetrieval(log));
  }

  /**
   * Enrich logs with COURSE_RELEVANCE_FILTER step data
   *
   * Returns one enriched log per query log with all skills in a single step.
   * The logger now creates ONE step with allSkillsMetrics array instead of N steps (one per skill).
   */
  async toCourseFilterEnrichedLogs(
    queryLogIds: string[],
  ): Promise<QueryLogWithCourseFilterGrouped[]> {
    this.logger.log(
      `Enriching ${queryLogIds.length} logs with COURSE_RELEVANCE_FILTER data`,
    );

    const logs = await this.reader.getQueryLogsByIds(queryLogIds);

    const results: QueryLogWithCourseFilterGrouped[] = [];

    for (const log of logs) {
      // Get SINGLE COURSE_RELEVANCE_FILTER step (contains all skills in allSkillsMetrics)
      const step = log.processSteps?.find(
        (s) => s.stepName === STEP_NAME.COURSE_RELEVANCE_FILTER,
      );

      if (!step) {
        throw new Error(
          `Query log ${log.id} missing COURSE_RELEVANCE_FILTER step`,
        );
      }

      // Return with single step in array (for compatibility with existing type)
      results.push({
        ...log,
        courseFilterSteps: [step], // Single step with allSkillsMetrics array inside
      });
    }

    this.logger.log(
      `Created ${results.length} enriched entries from ${logs.length} query logs`,
    );
    return results;
  }

  /**
   * Enrich logs with COURSE_AGGREGATION step data
   */
  async toCourseAggregationEnrichedLogs(
    queryLogIds: string[],
  ): Promise<QueryLogWithAggregation[]> {
    this.logger.log(
      `Enriching ${queryLogIds.length} logs with COURSE_AGGREGATION data`,
    );

    const logs = await this.reader.getQueryLogsByIds(queryLogIds);
    return logs.map((log) => this.enrichWithAggregation(log));
  }

  /**
   * Enrich logs with ANSWER_SYNTHESIS step data
   */
  async toAnswerSynthesisEnrichedLogs(
    queryLogIds: string[],
  ): Promise<QueryLogWithAnswerSynthesis[]> {
    this.logger.log(
      `Enriching ${queryLogIds.length} logs with ANSWER_SYNTHESIS data`,
    );

    const logs = await this.reader.getQueryLogsByIds(queryLogIds);
    return logs.map((log) => this.enrichWithAnswerSynthesis(log));
  }

  // ==========================================================================
  // ENRICHMENT HELPER METHODS
  // ==========================================================================

  /**
   * Enrich a single log with SKILL_EXPANSION step
   * Returns the full step with all metadata (id, raw, llm, duration, etc.)
   */
  private enrichWithSkillExpansion(
    log: QueryProcessLogWithSteps,
  ): QueryLogWithSkillExpansion {
    const step = log.processSteps?.find(
      (s) => s.stepName === STEP_NAME.SKILL_EXPANSION,
    );

    if (!step) {
      throw new Error(`Query log ${log.id} missing SKILL_EXPANSION step`);
    }

    return {
      ...log,
      skillExpansionStep: step,
    };
  }

  /**
   * Enrich a single log with QUESTION_CLASSIFICATION step
   * Returns the full step with all metadata
   */
  private enrichWithClassification(
    log: QueryProcessLogWithSteps,
  ): QueryLogWithClassification {
    const step = log.processSteps?.find(
      (s) => s.stepName === STEP_NAME.QUESTION_CLASSIFICATION,
    );

    if (!step) {
      throw new Error(
        `Query log ${log.id} missing QUESTION_CLASSIFICATION step`,
      );
    }

    return {
      ...log,
      classificationStep: step,
    };
  }

  /**
   * Enrich a single log with COURSE_RETRIEVAL step
   * Returns the full step with all metadata
   */
  private enrichWithCourseRetrieval(
    log: QueryProcessLogWithSteps,
  ): QueryLogWithCourseRetrieval {
    const step = log.processSteps?.find(
      (s) => s.stepName === STEP_NAME.COURSE_RETRIEVAL,
    );

    if (!step) {
      throw new Error(`Query log ${log.id} missing COURSE_RETRIEVAL step`);
    }

    return {
      ...log,
      courseRetrievalStep: step,
    };
  }

  /**
   * Enrich a single log with COURSE_RELEVANCE_FILTER step
   * Returns the full step with all metadata
   */
  private enrichWithCourseFilter(
    log: QueryProcessLogWithSteps,
  ): QueryLogWithCourseFilter {
    const step = log.processSteps?.find(
      (s) => s.stepName === STEP_NAME.COURSE_RELEVANCE_FILTER,
    );

    if (!step) {
      throw new Error(
        `Query log ${log.id} missing COURSE_RELEVANCE_FILTER step`,
      );
    }

    return {
      ...log,
      courseFilterStep: step,
    };
  }

  /**
   * Enrich a single log with COURSE_AGGREGATION step
   * Returns the full step with all metadata
   */
  private enrichWithAggregation(
    log: QueryProcessLogWithSteps,
  ): QueryLogWithAggregation {
    const step = log.processSteps?.find(
      (s) => s.stepName === STEP_NAME.COURSE_AGGREGATION,
    );

    if (!step) {
      throw new Error(`Query log ${log.id} missing COURSE_AGGREGATION step`);
    }

    return {
      ...log,
      aggregationStep: step,
    };
  }

  /**
   * Enrich a single log with ANSWER_SYNTHESIS step
   * Returns the full step with all metadata
   */
  private enrichWithAnswerSynthesis(
    log: QueryProcessLogWithSteps,
  ): QueryLogWithAnswerSynthesis {
    const step = log.processSteps?.find(
      (s) => s.stepName === STEP_NAME.ANSWER_SYNTHESIS,
    );

    if (!step) {
      throw new Error(`Query log ${log.id} missing ANSWER_SYNTHESIS step`);
    }

    return {
      ...log,
      answerSynthesisStep: step,
    };
  }
}
