import { Injectable, Logger } from '@nestjs/common';

import { FileHelper } from 'src/shared/utils/file';

import { SerializationHelper } from 'src/modules/query-logging/helpers/serialization.helper';
import type {
  AnswerSynthesisRawOutput,
  ClassificationRawOutput,
  CourseAggregationRawOutput,
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
      const firstStep = log.courseFilterSteps[0];

      // 1. Get and serialize raw output (same for all skills)
      const rawOutput = firstStep.output?.raw as CourseFilterRawOutput;
      const serializedRaw = rawOutput
        ? SerializationHelper.serializeCourseFilterResult(rawOutput)
        : undefined;

      // 2. Build per-skill Records
      const llmInfoBySkill: Record<string, any> = {};
      const tokenUsageBySkill: Record<string, any> = {};
      const metricsBySkill: Record<string, any> = {};
      const totalTokenUsage = { input: 0, output: 0, total: 0 };

      for (const step of log.courseFilterSteps) {
        const skill = step.input?.skill as string;

        // LLM info from step.llm
        if (step.llm) {
          llmInfoBySkill[skill] = {
            model: step.llm.model,
            provider: step.llm.provider,
            systemPrompt: step.llm.userPrompt,
            userPrompt: step.llm.userPrompt,
            promptVersion: step.llm.promptVersion,
          };
        }

        // Token usage
        if (step.llm?.tokenUsage) {
          tokenUsageBySkill[skill] = step.llm.tokenUsage;
          totalTokenUsage.input += step.llm.tokenUsage.input;
          totalTokenUsage.output += step.llm.tokenUsage.output;
          totalTokenUsage.total += step.llm.tokenUsage.total;
        }

        // Metrics from output.metrics
        const metrics = step.output?.metrics;
        if (metrics) {
          const filterMetrics =
            metrics as import('src/modules/query-logging/types/query-log-step.type').CourseFilterStepOutput;
          metricsBySkill[skill] = {
            inputCount: filterMetrics.inputCount,
            acceptedCount: filterMetrics.acceptedCount,
            rejectedCount: filterMetrics.rejectedCount,
            missingCount: filterMetrics.missingCount,
            llmDecisionRate: filterMetrics.llmDecisionRate,
            llmRejectionRate: filterMetrics.llmRejectionRate,
            llmFallbackRate: filterMetrics.llmFallbackRate,
            scoreDistribution: filterMetrics.scoreDistribution,
            avgScore: filterMetrics.avgScore,
            stepId: step.id,
          };
        } else {
          this.logger.warn(`No metrics for step ${step.id}, skill ${skill}`);
          metricsBySkill[skill] = {
            inputCount: 0,
            acceptedCount: 0,
            rejectedCount: 0,
            missingCount: 0,
            llmDecisionRate: 0,
            llmRejectionRate: 0,
            llmFallbackRate: 0,
            scoreDistribution: { score1: 0, score2: 0, score3: 0 },
            stepId: step.id,
          };
        }
      }

      return {
        queryLogId: log.id,
        question: log.question,
        llmModel: firstStep?.llm?.model,
        llmProvider: firstStep?.llm?.provider,
        promptVersion: firstStep?.llm?.promptVersion,
        duration: firstStep?.duration,
        rawOutput: serializedRaw,
        llmInfoBySkill,
        totalTokenUsage,
        tokenUsageBySkill,
        metricsBySkill,
      };
    });
  }

  /**
   * Build test set from COURSE_AGGREGATION step
   * Returns SERIALIZED type (ready for JSON storage)
   * Creates ONE entry per skill (flattened from the Map structure)
   */
  async buildCourseAggregationTestSet(
    queryLogIds: string[],
  ): Promise<CourseAggregationTestSetSerialized[]> {
    this.logger.log(
      `Building COURSE_AGGREGATION test set from ${queryLogIds.length} query logs`,
    );

    const enrichedLogs =
      await this.transformer.toCourseAggregationEnrichedLogs(queryLogIds);

    const results: CourseAggregationTestSetSerialized[] = [];

    for (const log of enrichedLogs) {
      const step = log.aggregationStep;
      const raw = step.output?.raw as CourseAggregationRawOutput;

      if (!raw) {
        this.logger.warn(`No raw output for query log ${log.id}`);
        continue;
      }

      // Serialize Map to Object for JSON storage
      const serializedRaw =
        SerializationHelper.serializeCourseAggregationResult(raw);

      // Get all skills from the filteredSkillCoursesMap
      const skills = Object.keys(serializedRaw.filteredSkillCoursesMap);

      // Create one entry per skill
      for (const skill of skills) {
        results.push({
          queryLogId: log.id,
          question: log.question,
          skill,
          courses: serializedRaw.filteredSkillCoursesMap[skill] || [],
          rankedCourses: raw?.rankedCourses ?? [],
          duration: step.duration,
        });
      }
    }

    this.logger.log(
      `Created ${results.length} test entries from ${queryLogIds.length} query logs`,
    );
    return results;
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
