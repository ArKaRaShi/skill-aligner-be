import { Injectable, Logger, Optional } from '@nestjs/common';

import * as path from 'node:path';
import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
import { DecimalHelper } from 'src/shared/utils/decimal.helper';
import { FileHelper } from 'src/shared/utils/file';

import { EvaluationHashUtil } from '../../shared/utils/evaluation-hash.util';
import { CourseRetrieverEvaluator } from '../evaluators/course-retriever.evaluator';
import {
  CourseRetrievalDedupeGroup,
  CourseRetrievalDedupeKey,
  CourseRetrievalProgressEntry,
  CourseRetrieverTestCase,
  EvaluateRetrieverInput,
  EvaluateRetrieverOutput,
  RunTestSetInput,
} from '../types/course-retrieval.types';
import { CourseRetrievalMetricsCalculator } from './course-retrieval-metrics-calculator.service';
import { CourseRetrievalResultManagerService } from './course-retrieval-result-manager.service';

/**
 * Additional context for course retriever evaluations
 */
export type CourseRetrievalEvaluationContext = {
  iterationNumber?: number;
  prefixDir?: string;
  judgeModel?: string;
  judgeProvider?: string;
};

/**
 * Service for running course retrieval evaluations.
 *
 * Handles pipeline execution, result persistence, and file organization.
 * Uses direct class injection (modern pattern) instead of contract-based tokens.
 *
 * Progress tracking is done at SAMPLE level (question + skill combination).
 * Each sample is tracked independently with a unique hash based on question, skill,
 * and optional testCaseId. This enables crash recovery and resumable evaluations.
 *
 * @example
 * ```typescript
 * const runner = appContext.get(CourseRetrievalRunnerService);
 * await runner.runTestSet({ testSet, iterationNumber: 1 });
 * ```
 */
/**
 * Default concurrency limit for parallel group evaluation
 *
 * Number of deduplication groups to process simultaneously.
 * Higher concurrency = faster evaluation but more LLM requests in-flight.
 *
 * Trade-offs:
 * - c=1: Sequential, easiest debugging
 * - c=3: Good balance (default)
 * - c=5+: Fast, but may hit rate limits
 */
const DEFAULT_CONCURRENCY = 3;

@Injectable()
export class CourseRetrievalRunnerService {
  private readonly logger = new Logger(CourseRetrievalRunnerService.name);
  private readonly baseDir: string;
  private readonly concurrency = DEFAULT_CONCURRENCY;

  constructor(
    private readonly evaluator: CourseRetrieverEvaluator,
    private readonly resultManager: CourseRetrievalResultManagerService,
    @Optional() baseDir?: string,
  ) {
    this.baseDir = baseDir ?? 'data/evaluation/course-retriever';
  }

  /**
   * Run a complete test set with multiple test cases
   *
   * This is the main entry point for running batch evaluations.
   * Implements cross-question deduplication: groups test cases by
   * (skill, courses) and evaluates each unique group only once.
   *
   * Progress tracking: Loads existing progress at the start, checks for
   * completed groups (by dedupe key), skips evaluations if already completed,
   * and saves progress after each group for crash recovery.
   *
   * @param input - Test set and iteration configuration
   */
  async runTestSet(input: RunTestSetInput): Promise<void> {
    const { testSet, iterationNumber } = input;
    const startTime = Date.now();

    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`Running ${testSet.name}`);
    this.logger.log(`Test cases: ${testSet.cases.length}`);
    this.logger.log(`Iteration: ${iterationNumber}`);
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Ensure directory structure exists
    await this.resultManager.ensureDirectoryStructure(testSet.name);

    // NEW: Group test cases by (skill, courses) for cross-question deduplication
    const dedupeGroups = this.groupByDedupeKey(testSet.cases);
    const totalTestCases = testSet.cases.length;
    const uniqueGroups = dedupeGroups.size;
    const duplicatesRemoved = totalTestCases - uniqueGroups;
    const deduplicationRate =
      totalTestCases > 0 ? (duplicatesRemoved / totalTestCases) * 100 : 0;

    this.logger.log(`Test cases: ${totalTestCases}`);
    this.logger.log(`Unique (skill, courses) groups: ${uniqueGroups}`);
    this.logger.log(
      `Cross-question deduplication: ${duplicatesRemoved}/${totalTestCases} duplicates removed (${deduplicationRate.toFixed(1)}% reduction)`,
    );

    // Load existing progress (if any)
    const progress = await this.resultManager.loadProgress({
      testSetName: testSet.name,
      iterationNumber,
    });

    // Initialize progress statistics for deduplication
    progress.statistics.totalItems = uniqueGroups;
    progress.statistics.completedItems = progress.entries.length;
    progress.statistics.pendingItems = uniqueGroups - progress.entries.length;
    progress.statistics.completionPercentage =
      uniqueGroups > 0 ? (progress.entries.length / uniqueGroups) * 100 : 0;

    // Add deduplication statistics to progress file
    progress.deduplicationStats = {
      totalTestCases,
      uniqueGroups,
      duplicateCount: duplicatesRemoved,
      deduplicationRate,
    };

    // Create a map of completed groups for quick lookup
    const completedGroups = new Map<string, CourseRetrievalProgressEntry>(
      progress.entries.map((entry) => [entry.dedupeKey ?? entry.hash, entry]),
    );

    this.logger.log(
      `Progress: ${progress.entries.length}/${uniqueGroups} groups completed (${progress.statistics.completionPercentage.toFixed(1)}%)`,
    );

    // Convert dedupeGroups Map to array for chunked processing
    const groupEntries = Array.from(dedupeGroups.entries());

    // Run each unique deduplication group with chunked concurrency
    const allRecords: EvaluateRetrieverOutput[] = [];

    // Process groups in chunks for parallel execution
    for (let i = 0; i < groupEntries.length; i += this.concurrency) {
      const concurrentGroups = groupEntries.slice(i, i + this.concurrency);
      const chunkNumber = Math.floor(i / this.concurrency) + 1;
      const totalChunks = Math.ceil(groupEntries.length / this.concurrency);

      this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      this.logger.log(
        `Chunk ${chunkNumber}/${totalChunks}: Processing ${concurrentGroups.length} group(s)`,
      );

      // Separate completed (cached) and pending groups in this chunk
      const completedInChunk: Array<{
        dedupeKey: string;
        group: CourseRetrievalDedupeGroup;
        entry: CourseRetrievalProgressEntry;
      }> = [];
      const pendingInChunk: Array<{
        dedupeKey: string;
        group: CourseRetrievalDedupeGroup;
        groupNumber: number;
      }> = [];

      for (const [dedupeKey, group] of concurrentGroups) {
        const groupNumber =
          i + concurrentGroups.indexOf([dedupeKey, group]) + 1;

        if (completedGroups.has(dedupeKey)) {
          const cachedEntry = completedGroups.get(dedupeKey)!;
          completedInChunk.push({ dedupeKey, group, entry: cachedEntry });
          this.logger.log(
            `[Group ${groupNumber}/${dedupeGroups.size}] Skipping ${dedupeKey.substring(0, 24)}... (already completed)`,
          );
        } else {
          pendingInChunk.push({ dedupeKey, group, groupNumber });
        }
      }

      // Process completed groups (cached results - no LLM calls needed)
      for (const { group, entry } of completedInChunk) {
        for (const testCase of group.testCases) {
          const cachedResult = this.createCachedResult(testCase, entry);
          allRecords.push(cachedResult);
        }
      }

      // Process pending groups in parallel within this chunk
      const newProgressEntries: CourseRetrievalProgressEntry[] = [];
      const batchRecords: EvaluateRetrieverOutput[] = [];

      const results = await Promise.allSettled(
        pendingInChunk.map(async ({ dedupeKey, group, groupNumber }) => {
          const { skill, courses, coursesHash, testCases } = group;
          const progressPrefix = `[Group ${groupNumber}/${dedupeGroups.size}]`;

          this.logger.log(
            `${progressPrefix} Evaluating: ${skill} (${testCases.length} questions share this retrieval)`,
          );
          this.logger.log(`  Courses: ${courses.length}`);

          // Run evaluation once for the entire group
          const evaluationResult = await this.evaluator.evaluate(
            {
              question: testCases[0].question, // Question doesn't affect evaluation
              skill,
              retrievedCourses: courses,
            },
            {
              model: input.judgeModel,
              provider: input.judgeProvider,
            },
          );

          // Log evaluation metrics
          this.logger.log('=== Evaluation Results ===');
          this.logger.log(
            `Mean Relevance: ${evaluationResult.metrics.meanRelevanceScore.toFixed(DECIMAL_PRECISION.PERCENTAGE)}/3`,
          );
          this.logger.log(
            `Highly Relevant: ${evaluationResult.metrics.perClassDistribution.score3.macroAverageRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
          );
          this.logger.log(
            `Irrelevant: ${evaluationResult.metrics.perClassDistribution.score0.macroAverageRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
          );

          // Create records for ALL test cases in this deduplication group
          const records: EvaluateRetrieverOutput[] = [];
          for (const testCase of testCases) {
            const result: EvaluateRetrieverOutput = {
              testCaseId: testCase.id,
              question: testCase.question,
              skill,
              retrievedCount: courses.length,
              evaluations: evaluationResult.evaluations,
              metrics: evaluationResult.metrics,
              llmModel: evaluationResult.llmInfo.model,
              llmProvider: evaluationResult.llmInfo.provider ?? 'unknown',
              inputTokens: evaluationResult.llmTokenUsage.inputTokens,
              outputTokens: evaluationResult.llmTokenUsage.outputTokens,
            };

            records.push(result);

            // Save record to hash-based file for crash recovery
            const recordHash =
              EvaluationHashUtil.generateCourseRetrievalRecordHash({
                question: testCase.question,
                skill,
                testCaseId: testCase.id,
              });

            await this.resultManager.saveRecord({
              testSetName: testSet.name,
              iterationNumber,
              hash: recordHash,
              record: result,
            });
          }

          // Create progress entry (one per deduplication group)
          const progressEntry: CourseRetrievalProgressEntry = {
            hash: coursesHash, // Pure SHA256 hash (64 hex chars)
            dedupeKey,
            skill,
            testCases: testCases.map((tc) => tc.id),
            completedAt: new Date().toISOString(),
            result: {
              retrievedCount: courses.length,
              meanRelevanceScore: evaluationResult.metrics.meanRelevanceScore,
            },
          };

          return {
            progressEntry,
            records,
          };
        }),
      );

      // Process successful results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { progressEntry, records } = result.value;
          newProgressEntries.push(progressEntry);
          batchRecords.push(...records);
          completedGroups.set(progressEntry.dedupeKey, progressEntry);
        }
      }

      // Check for failures
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        this.logger.warn(
          `${failures.length} group(s) failed in chunk ${chunkNumber}`,
        );
        for (const failure of failures) {
          this.logger.error(
            `  Error: ${failure.reason instanceof Error ? failure.reason.message : String(failure.reason)}`,
          );
        }
      }

      // Add all records from this chunk
      allRecords.push(...batchRecords);

      // Save progress once per chunk (not per group) to avoid file corruption
      progress.entries.push(...newProgressEntries);
      progress.statistics.completedItems = progress.entries.length;
      progress.statistics.pendingItems = uniqueGroups - progress.entries.length;
      progress.statistics.completionPercentage =
        uniqueGroups > 0 ? (progress.entries.length / uniqueGroups) * 100 : 0;

      await this.resultManager.saveProgress(progress);

      this.logger.log(
        `Chunk ${chunkNumber}/${totalChunks} complete: ${newProgressEntries.length} group(s) evaluated, ${completedInChunk.length} cached`,
      );
      this.logger.log(
        `Progress: ${progress.entries.length}/${uniqueGroups} groups (${progress.statistics.completionPercentage.toFixed(1)}%)`,
      );
    }

    // Save records (final save - redundant but ensures consistency)
    await this.resultManager.saveIterationRecords({
      testSetName: testSet.name,
      iterationNumber,
      records: allRecords,
    });

    // Save iteration metrics (for cross-iteration aggregation)
    await this.resultManager.saveIterationMetrics({
      testSetName: testSet.name,
      iterationNumber,
      records: allRecords,
    });

    // Save iteration cost
    await this.resultManager.saveIterationCost({
      testSetName: testSet.name,
      iterationNumber,
      judgeModel: input.judgeModel ?? 'gpt-4o',
      judgeProvider: input.judgeProvider ?? 'openai',
      records: allRecords,
    });

    // Calculate aggregated metrics using TREC-standard mean averaging
    const metrics =
      CourseRetrievalMetricsCalculator.calculateMeanMetrics(allRecords);

    const duration = Date.now() - startTime;
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`Completed ${testSet.name} iteration ${iterationNumber}`);
    this.logger.log(
      `Total duration: ${DecimalHelper.formatTime(duration / 1000)}s`,
    );
    this.logger.log(
      `Mean relevance: ${metrics.meanRelevanceScore.toFixed(DECIMAL_PRECISION.PERCENTAGE)}/3`,
    );
    this.logger.log(
      `Highly relevant: ${metrics.perClassDistribution.score3.macroAverageRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
    );
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * Run complete course retrieval evaluation workflow
   *
   * @param context - Evaluation context (iteration number, prefix directory)
   * @param input - Pipeline input parameters
   * @returns Pipeline execution output with evaluation results
   */
  async runEvaluator(
    context: CourseRetrievalEvaluationContext,
    input: EvaluateRetrieverInput,
  ): Promise<EvaluateRetrieverOutput> {
    const startTime = Date.now();

    this.logger.log(`Starting evaluation for: "${input.question}"`);
    this.logger.log(`Skill: "${input.skill}"`);
    this.logger.log(`Retrieved courses: ${input.retrievedCourses.length}`);

    if (context?.iterationNumber !== undefined) {
      this.logger.log(`Iteration: ${context.iterationNumber}`);
    }
    if (context?.prefixDir) {
      this.logger.log(`Prefix directory: ${context.prefixDir}`);
    }

    // Execute evaluator
    const evaluationResult = await this.evaluator.evaluate(
      {
        question: input.question,
        skill: input.skill,
        retrievedCourses: input.retrievedCourses,
      },
      {
        model: context.judgeModel,
        provider: context.judgeProvider,
      },
    );

    // Log evaluation metrics
    this.logger.log('=== Evaluation Results ===');
    this.logger.log(
      `Mean Relevance: ${evaluationResult.metrics.meanRelevanceScore.toFixed(DECIMAL_PRECISION.PERCENTAGE)}/3`,
    );
    this.logger.log(
      `Highly Relevant: ${evaluationResult.metrics.perClassDistribution.score3.macroAverageRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
    );
    this.logger.log(
      `Irrelevant: ${evaluationResult.metrics.perClassDistribution.score0.macroAverageRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
    );

    const result: EvaluateRetrieverOutput = {
      testCaseId: input.testCaseId,
      question: evaluationResult.question,
      skill: evaluationResult.skill,
      retrievedCount: input.retrievedCourses.length,
      evaluations: evaluationResult.evaluations,
      metrics: evaluationResult.metrics,
      llmModel: evaluationResult.llmInfo.model,
      llmProvider: evaluationResult.llmInfo.provider ?? 'unknown',
      inputTokens: evaluationResult.llmTokenUsage.inputTokens,
      outputTokens: evaluationResult.llmTokenUsage.outputTokens,
    };

    // Save results
    const duration = Date.now() - startTime;
    await this.saveResults(result, duration, context);

    this.logger.log(`Evaluation completed in ${duration}ms`);

    return result;
  }

  /**
   * Save evaluation results to JSON files
   *
   * Creates two types of files:
   * 1. Timestamped evaluation file (e.g., evaluation-1234567890.json)
   * 2. Latest evaluation file (latest.json)
   *
   * @param result - The evaluation result to save
   * @param duration - Duration of evaluation in milliseconds
   * @param context - Additional evaluation context
   */
  async saveResults(
    result: EvaluateRetrieverOutput,
    duration: number,
    context: CourseRetrievalEvaluationContext,
  ): Promise<void> {
    const timestamp = Date.now();

    // Build output path
    let outputPath = this.baseDir;
    if (context?.prefixDir) {
      outputPath = path.join(outputPath, context.prefixDir);
    }
    if (context?.iterationNumber !== undefined) {
      outputPath = path.join(
        outputPath,
        `iteration-${context.iterationNumber}`,
      );
    }

    // Prepare output with metadata
    const output = {
      ...result,
      evaluationMetadata: {
        duration,
        timestamp: new Date(timestamp).toISOString(),
        iterationNumber: context?.iterationNumber,
        prefixDir: context?.prefixDir,
      },
    };

    // Save main evaluation file
    const evaluationFilePath = path.join(
      outputPath,
      `evaluation-${timestamp}.json`,
    );
    await FileHelper.saveJson(evaluationFilePath, output);

    // Save latest evaluation file
    const latestFilePath = path.join(outputPath, 'latest.json');
    await FileHelper.saveLatestJson(latestFilePath, output);

    this.logger.log(`Results saved to: ${outputPath}`);
  }

  /**
   * Get the base directory path for course retrieval evaluations
   *
   * @returns Base directory path
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Run evaluation with default test data
   *
   * @deprecated Use runTestSet() with TestSetFactory instead.
   * Convenience method for CLI/testing with hardcoded test scenarios.
   *
   * @param context - Evaluation context (iteration number, prefix directory)
   * @returns Pipeline execution output with evaluation results
   */
  async runWithDefaultTestData(
    context: CourseRetrievalEvaluationContext = {},
  ): Promise<EvaluateRetrieverOutput> {
    return this.runEvaluator(
      context,
      this.getDefaultTestData(context.iterationNumber),
    );
  }

  /**
   * Get default test data for evaluation
   *
   * @param _iterationNumber - Optional iteration number for variation (unused, reserved for future)
   * @returns Default test input for evaluation
   */
  private getDefaultTestData(
    _iterationNumber?: number,
  ): EvaluateRetrieverInput {
    return {
      question: 'How to learn Python programming?',
      skill: 'Python programming',
      retrievedCourses: [
        {
          subjectCode: 'CS101',
          subjectName: 'Introduction to Programming',
          cleanedLearningOutcomes: [
            'Understand basic programming concepts',
            'Learn Python syntax and semantics',
            'Write simple programs using loops and conditionals',
          ],
        },
        {
          subjectCode: 'CS201',
          subjectName: 'Advanced Python',
          cleanedLearningOutcomes: [
            'Master object-oriented programming in Python',
            'Work with files and databases',
            'Build web applications using Flask',
          ],
        },
        {
          subjectCode: 'CS301',
          subjectName: 'Data Structures',
          cleanedLearningOutcomes: [
            'Understand arrays, linked lists, and trees',
            'Implement sorting and searching algorithms',
            'Analyze algorithm complexity',
          ],
        },
        {
          subjectCode: 'MATH101',
          subjectName: 'Calculus I',
          cleanedLearningOutcomes: [
            'Understand limits and derivatives',
            'Learn integration techniques',
            'Apply calculus to real-world problems',
          ],
        },
        {
          subjectCode: 'CS401',
          subjectName: 'Machine Learning',
          cleanedLearningOutcomes: [
            'Introduction to supervised and unsupervised learning',
            'Implement neural networks using Python',
            'Work with pandas and scikit-learn',
          ],
        },
      ],
    };
  }

  /**
   * Group test cases by (skill, courses) for cross-question deduplication
   *
   * Creates deduplication groups where multiple questions that retrieve
   * the same courses for the same skill are grouped together.
   *
   * @param testCases - All test cases to group
   * @returns Map of dedupeKey -> deduplication group
   */
  private groupByDedupeKey(
    testCases: CourseRetrieverTestCase[],
  ): Map<CourseRetrievalDedupeKey, CourseRetrievalDedupeGroup> {
    const groups = new Map<string, CourseRetrievalDedupeGroup>();

    for (const testCase of testCases) {
      // Generate courses hash for deduplication
      const coursesHash = EvaluationHashUtil.hashCourses(
        testCase.retrievedCourses,
      );
      const dedupeKey: CourseRetrievalDedupeKey = `${testCase.skill}-${coursesHash}`;

      if (!groups.has(dedupeKey)) {
        groups.set(dedupeKey, {
          dedupeKey,
          skill: testCase.skill,
          courses: testCase.retrievedCourses,
          coursesHash,
          testCases: [],
        });
      }

      groups.get(dedupeKey)!.testCases.push(testCase);
    }

    this.logger.debug(
      `Created ${groups.size} deduplication groups from ${testCases.length} test cases`,
    );

    return groups;
  }

  /**
   * Create a cached result for a test case from a progress entry
   *
   * Used when a deduplication group was already evaluated in a previous run.
   *
   * @param testCase - The test case to create a result for
   * @param cachedEntry - The cached progress entry
   * @returns Cached evaluation result
   */
  private createCachedResult(
    testCase: CourseRetrieverTestCase,
    cachedEntry: CourseRetrievalProgressEntry,
  ): EvaluateRetrieverOutput {
    return {
      testCaseId: testCase.id,
      question: testCase.question,
      skill: cachedEntry.skill,
      retrievedCount: cachedEntry.result.retrievedCount,
      evaluations: [], // Empty for cached results
      metrics: {
        totalCourses: cachedEntry.result.retrievedCount,
        meanRelevanceScore: cachedEntry.result.meanRelevanceScore,
        perClassDistribution: {
          score0: {
            relevanceScore: 0,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'irrelevant',
          },
          score1: {
            relevanceScore: 1,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'slightly_relevant',
          },
          score2: {
            relevanceScore: 2,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'fairly_relevant',
          },
          score3: {
            relevanceScore: 3,
            count: 0,
            macroAverageRate: 0,
            microAverageRate: 0,
            label: 'highly_relevant',
          },
        },
        ndcg: {
          proxy: { at5: 0, at10: 0, at15: 0, atAll: 0 },
          ideal: { at5: 0, at10: 0, at15: 0, atAll: 0 },
        },
        precision: { at5: 0, at10: 0, at15: 0, atAll: 0 },
      },
      llmModel: 'cached',
      llmProvider: 'cached',
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}
