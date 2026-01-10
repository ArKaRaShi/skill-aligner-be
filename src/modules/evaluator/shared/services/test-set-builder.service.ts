import { Injectable, Logger } from '@nestjs/common';

import { FileHelper } from 'src/shared/utils/file';

import { SerializationHelper } from 'src/modules/query-logging/helpers/serialization.helper';
import type {
  AnswerSynthesisRawOutput,
  ClassificationRawOutput,
  CourseAggregationRawOutput,
  CourseFilterMergedMetrics,
  CourseFilterRawOutput,
  CourseRetrievalRawOutput,
  QueryProfileRawOutput,
  SkillExpansionRawOutput,
} from 'src/modules/query-logging/types/query-log-step.type';

import { TestSetTransformer } from '../transformers/test-set.transformer';
import type {
  AnswerSynthesisTestSet,
  ClassificationTestSet,
  CourseAggregationTestSetSerialized,
  CourseFilterTestSetSerialized,
  CourseRetrievalTestSetSerialized,
  QueryProfileTestSet,
  SkillExpansionTestSet,
} from './test-set.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TEST_SET_DIR = 'data/evaluation/test-sets';

// ============================================================================
// TEST SET BUILDER SERVICE
// ============================================================================

/**
 * Test Set Builder Service
 *
 * Builds test sets from query logs by extracting raw data from enriched logs.
 * Uses TestSetTransformer to get enriched logs, then extracts and formats the data.
 *
 * @example
 * ```ts
 * // Build skill expansion test set
 * const testSet = await testSetBuilder.buildSkillExpansionTestSet(queryLogIds);
 * // Returns: SkillExpansionTestSet[]
 * ```
 */
@Injectable()
export class TestSetBuilderService {
  private readonly logger = new Logger(TestSetBuilderService.name);

  constructor(private readonly transformer: TestSetTransformer) {}

  /**
   * Build test set from SKILL_EXPANSION step
   */
  async buildSkillExpansionTestSet(
    queryLogIds: string[],
  ): Promise<SkillExpansionTestSet[]> {
    this.logger.log(
      `Building SKILL_EXPANSION test set from ${queryLogIds.length} query logs`,
    );

    const enrichedLogs =
      await this.transformer.toSkillExpansionEnrichedLogs(queryLogIds);

    return enrichedLogs.map((log) => {
      const step = log.skillExpansionStep;
      const raw = step.output?.raw as SkillExpansionRawOutput;

      return {
        queryLogId: log.id,
        question: log.question,
        skills: raw?.skillItems ?? [],
        llmModel: step.llm?.model,
        llmProvider: step.llm?.provider,
        promptVersion: step.llm?.promptVersion,
        duration: step.duration,
        tokenUsage: step.llm?.tokenUsage,
      };
    });
  }

  /**
   * Build test set from QUESTION_CLASSIFICATION step
   */
  async buildClassificationTestSet(
    queryLogIds: string[],
  ): Promise<ClassificationTestSet[]> {
    this.logger.log(
      `Building QUESTION_CLASSIFICATION test set from ${queryLogIds.length} query logs`,
    );

    const enrichedLogs =
      await this.transformer.toClassificationEnrichedLogs(queryLogIds);

    return enrichedLogs.map((log) => {
      const step = log.classificationStep;
      const raw = step.output?.raw as ClassificationRawOutput;

      return {
        queryLogId: log.id,
        question: log.question,
        category: raw?.category ?? '',
        reason: raw?.reason ?? '',
        llmModel: step.llm?.model,
        llmProvider: step.llm?.provider,
        promptVersion: step.llm?.promptVersion,
        duration: step.duration,
        tokenUsage: step.llm?.tokenUsage,
      };
    });
  }

  /**
   * Build test set from QUERY_PROFILE_BUILDING step
   */
  async buildQueryProfileTestSet(
    queryLogIds: string[],
  ): Promise<QueryProfileTestSet[]> {
    this.logger.log(
      `Building QUERY_PROFILE_BUILDING test set from ${queryLogIds.length} query logs`,
    );

    const enrichedLogs =
      await this.transformer.toQueryProfileEnrichedLogs(queryLogIds);

    return enrichedLogs.map((log) => {
      const step = log.queryProfileStep;
      const raw = step.output?.raw as QueryProfileRawOutput;

      return {
        queryLogId: log.id,
        question: log.question,
        queryProfile: raw,
        llmModel: step.llm?.model,
        llmProvider: step.llm?.provider,
        duration: step.duration,
        tokenUsage: step.llm?.tokenUsage,
      };
    });
  }

  /**
   * Build test set from COURSE_RETRIEVAL step
   * Returns SERIALIZED type (ready for JSON storage)
   */
  async buildCourseRetrievalTestSet(
    queryLogIds: string[],
  ): Promise<CourseRetrievalTestSetSerialized[]> {
    this.logger.log(
      `Building COURSE_RETRIEVAL test set from ${queryLogIds.length} query logs`,
    );

    const enrichedLogs =
      await this.transformer.toCourseRetrievalEnrichedLogs(queryLogIds);

    return enrichedLogs.map((log) => {
      const step = log.courseRetrievalStep;
      const raw = step.output?.raw as CourseRetrievalRawOutput;

      // Serialize Map to Object for JSON storage
      const serializedRaw = raw
        ? SerializationHelper.serializeCourseRetrievalResult(raw)
        : null;

      return {
        queryLogId: log.id,
        question: log.question,
        skills: raw?.skills ?? [],
        skillCoursesMap: serializedRaw?.skillCoursesMap ?? {},
        embeddingUsage: raw?.embeddingUsage,
        duration: step.duration,
      };
    });
  }

  /**
   * Build test set from COURSE_RELEVANCE_FILTER step
   * Returns SERIALIZED type (ready for JSON storage)
   *
   * Comprehensive structure with raw output, LLM metadata, and metrics
   * Now reads from single step with allSkillsMetrics array.
   */
  async buildCourseFilterTestSet(
    queryLogIds: string[],
  ): Promise<CourseFilterTestSetSerialized[]> {
    this.logger.log(
      `Building COURSE_RELEVANCE_FILTER test set from ${queryLogIds.length} query logs`,
    );

    const enrichedLogs =
      await this.transformer.toCourseFilterEnrichedLogs(queryLogIds);

    return enrichedLogs.map((log) => {
      const step = log.courseFilterSteps[0]; // Single step now

      // 1. Get and serialize raw output (same for all skills)
      const rawOutput = step.output?.raw as CourseFilterRawOutput;
      const serializedRaw = rawOutput
        ? SerializationHelper.serializeCourseFilterResult(rawOutput)
        : undefined;

      // 2. Get merged metrics from step.output.metrics
      const mergedMetrics = step.output
        ?.metrics as unknown as CourseFilterMergedMetrics;
      const allSkillsMetrics = mergedMetrics?.allSkillsMetrics || [];

      // 3. Build per-skill Records from allSkillsMetrics array
      const llmInfoBySkill: Record<string, any> = {};
      const tokenUsageBySkill: Record<string, any> = {};
      const metricsBySkill: Record<string, any> = {};
      const totalTokenUsage = { input: 0, output: 0, total: 0 };

      for (const skillMetrics of allSkillsMetrics) {
        const skill = skillMetrics.skill;

        // Get per-skill llmInfo from the skill's metrics (not from step.llm)
        if (skillMetrics.llmInfo) {
          llmInfoBySkill[skill] = {
            model: skillMetrics.llmInfo.model,
            provider: skillMetrics.llmInfo.provider,
            systemPrompt: skillMetrics.llmInfo.systemPrompt,
            userPrompt: skillMetrics.llmInfo.userPrompt,
            promptVersion: skillMetrics.llmInfo.promptVersion,
          };
        }

        // Get per-skill tokenUsage from the skill's metrics
        if (skillMetrics.tokenUsage) {
          tokenUsageBySkill[skill] = skillMetrics.tokenUsage;
          totalTokenUsage.input += skillMetrics.tokenUsage.input;
          totalTokenUsage.output += skillMetrics.tokenUsage.output;
          totalTokenUsage.total += skillMetrics.tokenUsage.total;
        }

        // Metrics from allSkillsMetrics array
        metricsBySkill[skill] = {
          inputCount: skillMetrics.inputCount,
          acceptedCount: skillMetrics.acceptedCount,
          rejectedCount: skillMetrics.rejectedCount,
          missingCount: skillMetrics.missingCount,
          llmDecisionRate: skillMetrics.llmDecisionRate,
          llmRejectionRate: skillMetrics.llmRejectionRate,
          llmFallbackRate: skillMetrics.llmFallbackRate,
          scoreDistribution: skillMetrics.scoreDistribution,
          avgScore: skillMetrics.avgScore,
          stepId: step.id,
        };
      }

      // Get top-level LLM fields from first skill's llmInfo (all concurrent calls use same model)
      const firstSkillLlmInfo = allSkillsMetrics[0]?.llmInfo;

      return {
        queryLogId: log.id,
        question: log.question,
        llmModel: firstSkillLlmInfo?.model, // From first skill (all same model)
        llmProvider: firstSkillLlmInfo?.provider,
        promptVersion: firstSkillLlmInfo?.promptVersion,
        duration: step?.duration,
        rawOutput: serializedRaw,
        llmInfoBySkill,
        totalTokenUsage,
        tokenUsageBySkill, // YES - per-skill token usage (each skill has its own LLM call)
        metricsBySkill,
      };
    });
  }

  /**
   * Build test set from COURSE_AGGREGATION step
   * Returns SERIALIZED type (ready for JSON storage)
   * Creates ONE entry per question (with all skills' filtered courses and final ranked courses)
   */
  async buildCourseAggregationTestSet(
    queryLogIds: string[],
  ): Promise<CourseAggregationTestSetSerialized[]> {
    this.logger.log(
      `Building COURSE_AGGREGATION test set from ${queryLogIds.length} query logs`,
    );

    const enrichedLogs =
      await this.transformer.toCourseAggregationEnrichedLogs(queryLogIds);

    return enrichedLogs.map((log) => {
      const step = log.aggregationStep;
      const raw = step.output?.raw as CourseAggregationRawOutput;

      if (!raw) {
        this.logger.warn(`No raw output for query log ${log.id}`);
        return {
          queryLogId: log.id,
          question: log.question,
          filteredSkillCoursesMap: {},
          rankedCourses: [],
          duration: step.duration,
        };
      }

      // Serialize Map to Object for JSON storage
      const serializedRaw =
        SerializationHelper.serializeCourseAggregationResult(raw);

      return {
        queryLogId: log.id,
        question: log.question,
        filteredSkillCoursesMap: serializedRaw.filteredSkillCoursesMap,
        rankedCourses: raw.rankedCourses ?? [],
        duration: step.duration,
      };
    });
  }

  /**
   * Build test set from ANSWER_SYNTHESIS step
   */
  async buildAnswerSynthesisTestSet(
    queryLogIds: string[],
  ): Promise<AnswerSynthesisTestSet[]> {
    this.logger.log(
      `Building ANSWER_SYNTHESIS test set from ${queryLogIds.length} query logs`,
    );

    const enrichedLogs =
      await this.transformer.toAnswerSynthesisEnrichedLogs(queryLogIds);

    return enrichedLogs.map((log) => {
      const step = log.answerSynthesisStep;
      const raw = step.output?.raw as AnswerSynthesisRawOutput;

      return {
        queryLogId: log.id,
        question: log.question,
        answer: raw?.answer ?? '',
        llmModel: step.llm?.model,
        llmProvider: step.llm?.provider,
        promptVersion: step.llm?.promptVersion,
        duration: step.duration,
        tokenUsage: step.llm?.tokenUsage,
      };
    });
  }

  // ==========================================================================
  // SAVE METHODS (write test sets to JSON files)
  // ==========================================================================

  /**
   * Save test set to JSON file
   * @param testSet - The test set array to save
   * @param filename - Name of the file (without extension)
   * @param directory - Optional directory path (defaults to DEFAULT_TEST_SET_DIR)
   */
  async saveTestSet<T>(
    testSet: T[],
    filename: string,
    directory: string = DEFAULT_TEST_SET_DIR,
  ): Promise<string> {
    const filepath = `${directory}/${filename}.json`;
    await FileHelper.saveJson(filepath, testSet);
    this.logger.log(`Saved test set to ${filepath}`);
    return filepath;
  }

  /**
   * Build and save COURSE_RETRIEVAL test set
   */
  async buildAndSaveCourseRetrievalTestSet(
    queryLogIds: string[],
    filename: string,
    directory?: string,
  ): Promise<string> {
    const testSet = await this.buildCourseRetrievalTestSet(queryLogIds);
    return this.saveTestSet(testSet, filename, directory);
  }

  /**
   * Build and save COURSE_RELEVANCE_FILTER test set
   */
  async buildAndSaveCourseFilterTestSet(
    queryLogIds: string[],
    filename: string,
    directory?: string,
  ): Promise<string> {
    const testSet = await this.buildCourseFilterTestSet(queryLogIds);
    return this.saveTestSet(testSet, filename, directory);
  }

  /**
   * Build and save COURSE_AGGREGATION test set
   */
  async buildAndSaveCourseAggregationTestSet(
    queryLogIds: string[],
    filename: string,
    directory?: string,
  ): Promise<string> {
    const testSet = await this.buildCourseAggregationTestSet(queryLogIds);
    return this.saveTestSet(testSet, filename, directory);
  }

  /**
   * Build and save SKILL_EXPANSION test set
   */
  async buildAndSaveSkillExpansionTestSet(
    queryLogIds: string[],
    filename: string,
    directory?: string,
  ): Promise<string> {
    const testSet = await this.buildSkillExpansionTestSet(queryLogIds);
    return this.saveTestSet(testSet, filename, directory);
  }

  /**
   * Build and save QUESTION_CLASSIFICATION test set
   */
  async buildAndSaveClassificationTestSet(
    queryLogIds: string[],
    filename: string,
    directory?: string,
  ): Promise<string> {
    const testSet = await this.buildClassificationTestSet(queryLogIds);
    return this.saveTestSet(testSet, filename, directory);
  }

  /**
   * Build and save QUERY_PROFILE_BUILDING test set
   */
  async buildAndSaveQueryProfileTestSet(
    queryLogIds: string[],
    filename: string,
    directory?: string,
  ): Promise<string> {
    const testSet = await this.buildQueryProfileTestSet(queryLogIds);
    return this.saveTestSet(testSet, filename, directory);
  }

  /**
   * Build and save ANSWER_SYNTHESIS test set
   */
  async buildAndSaveAnswerSynthesisTestSet(
    queryLogIds: string[],
    filename: string,
    directory?: string,
  ): Promise<string> {
    const testSet = await this.buildAnswerSynthesisTestSet(queryLogIds);
    return this.saveTestSet(testSet, filename, directory);
  }
}
