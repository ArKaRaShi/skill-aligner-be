import { Injectable, Logger } from '@nestjs/common';

import type { Identifier } from '../../../shared/contracts/types/identifier';
import type { CourseRelevanceFilterResultV2 } from '../../query-processor/types/course-relevance-filter.type';
import type { IQueryLoggingRepository } from '../contracts/i-query-logging-repository.contract';
import { QueryStepParserHelper } from '../helpers/query-step-parser.helper';
import { SerializationHelper } from '../helpers/serialization.helper';
import type {
  CourseAggregationRawOutput,
  CourseRetrievalRawOutput,
  QueryProcessLogWithSteps,
  ServiceRawOutput,
} from '../types/query-log-step.type';
import { STEP_NAME, type StepName } from '../types/query-status.type';

/**
 * Query Pipeline Reader Service
 *
 * Reads query logs from the database and deserializes them back to
 * properly-typed structures. Handles:
 *
 * 1. Type-safe parsing of raw outputs using Zod schemas
 * 2. Map reconstruction (JSONB Objects → Maps)
 * 3. Discriminator-based type narrowing using STEP_NAME
 *
 * @example
 * ```ts
 * const log = await readerService.getQueryLogById(logId);
 * const skillExpansionStep = log.processSteps.find(
 *   s => s.stepName === STEP_NAME.SKILL_EXPANSION
 * );
 * const rawOutput = skillExpansionStep.output.raw; // Properly typed!
 * ```
 */
@Injectable()
export class QueryPipelineReaderService {
  private readonly logger = new Logger(QueryPipelineReaderService.name);
  private readonly parser = new QueryStepParserHelper();

  constructor(private readonly repository: IQueryLoggingRepository) {}

  /**
   * Get a query log by ID with all steps, parsed back to original types.
   *
   * @param id - Query log ID
   * @returns Query log with properly typed step outputs, or null if not found
   */
  async getQueryLogById(id: string): Promise<QueryProcessLogWithSteps | null> {
    this.logger.debug(`Fetching query log: ${id}`);

    const log = await this.repository.findQueryLogById(id as Identifier, true);

    if (!log) {
      this.logger.warn(`Query log not found: ${id}`);
      return null;
    }

    return this.parseQueryLog(log as QueryProcessLogWithSteps);
  }

  /**
   * Get multiple query logs by IDs with all steps, parsed back to original types.
   *
   * @param ids - Array of query log IDs
   * @returns Array of query logs with properly typed step outputs
   */
  async getQueryLogsByIds(ids: string[]): Promise<QueryProcessLogWithSteps[]> {
    this.logger.debug(`Fetching ${ids.length} query logs`);

    const logs: QueryProcessLogWithSteps[] = [];

    for (const id of ids) {
      const log = await this.getQueryLogById(id);
      if (log) {
        logs.push(log);
      }
    }

    return logs;
  }

  /**
   * Parse a single step's output back to properly typed structure.
   *
   * @param stepName - The step name (discriminator)
   * @param rawOutput - Raw output from JSONB storage
   * @returns Properly typed ServiceRawOutput
   */
  parseStepOutput(stepName: StepName, rawOutput: unknown): ServiceRawOutput {
    return this.parser.parseRawOutput(stepName, rawOutput);
  }

  /**
   * Parse entire query log, including all step outputs.
   *
   * Converts:
   * - Raw outputs (any → specific type)
   * - Maps (Record → Map)
   *
   * @param log - Query log from database
   * @returns Parsed query log with proper types
   */
  private parseQueryLog(
    log: QueryProcessLogWithSteps,
  ): QueryProcessLogWithSteps {
    // Parse each step's output
    const parsedSteps = log.processSteps.map((step) => this.parseStep(step));

    return {
      ...log,
      processSteps: parsedSteps,
    };
  }

  /**
   * Parse a single step, reconstructing its output types.
   */
  private parseStep(step: QueryProcessLogWithSteps['processSteps'][number]) {
    const parsedStep = { ...step };

    // Debug log for steps with Maps before parsing
    if (this.stepHasMaps(parsedStep.stepName)) {
      this.logger.debug(`Parsing step: ${parsedStep.stepName}`);
      this.logger.debug(
        `Raw output: ${JSON.stringify(parsedStep.output?.raw)}`,
      );
    }

    // Parse output if present
    if (parsedStep.output?.raw) {
      const rawOutput = this.parser.parseRawOutput(
        parsedStep.stepName,
        parsedStep.output.raw,
      );

      parsedStep.output = {
        ...parsedStep.output,
        raw: rawOutput,
      };
    }

    // Debug log for steps with Maps after parsing (with proper Map serialization)
    if (parsedStep.stepName === STEP_NAME.COURSE_RETRIEVAL) {
      const serialized = parsedStep.output?.raw
        ? SerializationHelper.serializeCourseRetrievalResult(
            parsedStep.output.raw as CourseRetrievalRawOutput,
          )
        : null;
      this.logger.debug(
        `Parsed output: ${JSON.stringify(serialized, null, 2)}`,
      );
    }

    if (parsedStep.stepName === STEP_NAME.COURSE_RELEVANCE_FILTER) {
      const serialized = parsedStep.output?.raw
        ? SerializationHelper.serializeCourseFilterResult(
            parsedStep.output.raw as CourseRelevanceFilterResultV2,
          )
        : null;
      this.logger.debug(
        `Parsed output: ${JSON.stringify(serialized, null, 2)}`,
      );
    }

    if (parsedStep.stepName === STEP_NAME.COURSE_AGGREGATION) {
      const serialized = parsedStep.output?.raw
        ? SerializationHelper.serializeCourseAggregationResult(
            parsedStep.output.raw as CourseAggregationRawOutput,
          )
        : null;
      this.logger.debug(
        `Parsed output: ${JSON.stringify(serialized, null, 2)}`,
      );
    }

    return parsedStep;
  }

  /**
   * Check if a step output contains Map objects that need special serialization.
   */
  private stepHasMaps(stepName: StepName): boolean {
    const stepsWithMaps: StepName[] = [
      STEP_NAME.COURSE_RETRIEVAL,
      STEP_NAME.COURSE_RELEVANCE_FILTER,
      STEP_NAME.COURSE_AGGREGATION,
    ];
    return stepsWithMaps.includes(stepName);
  }

  /**
   * Get a specific step from a query log by step name.
   *
   * @param queryLogId - Query log ID
   * @param stepName - Step name to retrieve
   * @returns The specific step, or null if not found
   */
  async getStepByName(
    queryLogId: string,
    stepName: StepName,
  ): Promise<QueryProcessLogWithSteps['processSteps'][number] | null> {
    const log = await this.getQueryLogById(queryLogId);

    if (!log) {
      return null;
    }

    return log.processSteps.find((step) => step.stepName === stepName) || null;
  }

  /**
   * Get raw output for a specific step.
   *
   * @param queryLogId - Query log ID
   * @param stepName - Step name
   * @returns Properly typed raw output, or null if not found
   */
  async getStepRawOutput<T extends ServiceRawOutput>(
    queryLogId: string,
    stepName: StepName,
  ): Promise<T | null> {
    const step = await this.getStepByName(queryLogId, stepName);

    if (!step?.output?.raw) {
      return null;
    }

    return step.output.raw as T;
  }
}
