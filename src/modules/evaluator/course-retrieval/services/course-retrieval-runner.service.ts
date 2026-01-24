import { Injectable, Logger, Optional } from '@nestjs/common';

import * as path from 'node:path';
import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
import { DecimalHelper } from 'src/shared/utils/decimal.helper';
import { FileHelper } from 'src/shared/utils/file';

import { CourseRetrieverEvaluator } from '../evaluators/course-retriever.evaluator';
import {
  CourseRetrievalHashParams,
  CourseRetrievalProgressEntry,
  EvaluateRetrieverInput,
  EvaluateRetrieverOutput,
  EvaluationItem,
  RunTestSetInput,
} from '../types/course-retrieval.types';
import { CourseRetrievalHashUtil } from '../utils/course-retrieval-hash.util';
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
@Injectable()
export class CourseRetrievalRunnerService {
  private readonly logger = new Logger(CourseRetrievalRunnerService.name);
  private readonly baseDir: string;

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
   * Iterates through all test cases, collects results, calculates metrics,
   * and saves everything using the result manager.
   *
   * Progress tracking: Loads existing progress at the start, checks for
   * completed samples (by hash), skips evaluations if already completed,
   * and saves progress after each sample for crash recovery.
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

    // Load existing progress (if any)
    const progress = await this.resultManager.loadProgress({
      testSetName: testSet.name,
      iterationNumber,
    });

    // Initialize progress statistics
    progress.statistics.totalItems = testSet.cases.length;
    progress.statistics.pendingItems =
      progress.statistics.totalItems - progress.entries.length;
    progress.statistics.completionPercentage =
      progress.statistics.totalItems > 0
        ? (progress.entries.length / progress.statistics.totalItems) * 100
        : 0;

    // Create a map of completed samples for quick lookup
    const completedSampleHashes = new Map<string, CourseRetrievalProgressEntry>(
      progress.entries.map((entry) => [entry.hash, entry]),
    );

    this.logger.log(
      `Progress: ${progress.entries.length}/${testSet.cases.length} samples completed (${progress.statistics.completionPercentage.toFixed(1)}%)`,
    );

    // Run each test case
    const records: EvaluateRetrieverOutput[] = [];
    for (let i = 0; i < testSet.cases.length; i++) {
      const testCase = testSet.cases[i];
      const progressPrefix = `[${i + 1}/${testSet.cases.length}]`;

      // Generate hash for this sample
      const hash = this.generateSampleHash({
        question: testCase.question,
        skill: testCase.skill,
        testCaseId: testCase.id,
      });

      // Check if this sample was already evaluated
      if (completedSampleHashes.has(hash)) {
        const cachedEntry = completedSampleHashes.get(hash)!;
        this.logger.log(
          `${progressPrefix} Skipping ${testCase.id} (already completed)`,
        );

        // Create cached result from progress entry
        const cachedResult: EvaluateRetrieverOutput = {
          testCaseId: cachedEntry.testCaseId,
          question: cachedEntry.question,
          skill: cachedEntry.skill,
          retrievedCount: cachedEntry.result.retrievedCount,
          evaluations: [], // Empty since we're not storing full evaluations in progress
          metrics: {
            totalCourses: cachedEntry.result.retrievedCount,
            averageRelevance: cachedEntry.result.averageRelevance,
            scoreDistribution: [],
            highlyRelevantCount: 0,
            highlyRelevantRate: 0,
            irrelevantCount: 0,
            irrelevantRate: 0,
            ndcg: { at5: 0, at10: 0, atAll: 0 },
            precision: { at5: 0, at10: 0, atAll: 0 },
          },
          llmModel: 'cached',
          llmProvider: 'cached',
          inputTokens: 0,
          outputTokens: 0,
        };

        records.push(cachedResult);
        continue;
      }

      this.logger.log(`${progressPrefix} Running: ${testCase.id}`);
      this.logger.log(`  Question: "${testCase.question}"`);
      this.logger.log(`  Skill: "${testCase.skill}"`);
      this.logger.log(`  Courses: ${testCase.retrievedCourses.length}`);
      const HASH_DISPLAY_LENGTH = 16;
      this.logger.log(`  Hash: ${hash.substring(0, HASH_DISPLAY_LENGTH)}...`);

      // Run evaluation for this test case
      const evaluationResult = await this.evaluator.evaluate(
        {
          question: testCase.question,
          skill: testCase.skill,
          retrievedCourses: testCase.retrievedCourses,
        },
        {
          model: input.judgeModel,
          provider: input.judgeProvider,
        },
      );

      // Log evaluation metrics
      this.logger.log('=== Evaluation Results ===');
      this.logger.log(
        `Avg Relevance: ${evaluationResult.metrics.averageRelevance.toFixed(DECIMAL_PRECISION.PERCENTAGE)}/3`,
      );
      this.logger.log(
        `Highly Relevant: ${evaluationResult.metrics.highlyRelevantRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
      );
      this.logger.log(
        `Irrelevant: ${evaluationResult.metrics.irrelevantRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
      );

      const result: EvaluateRetrieverOutput = {
        testCaseId: testCase.id,
        question: evaluationResult.question,
        skill: evaluationResult.skill,
        retrievedCount: testCase.retrievedCourses.length,
        evaluations: evaluationResult.evaluations,
        metrics: evaluationResult.metrics,
        llmModel: evaluationResult.llmInfo.model,
        llmProvider: evaluationResult.llmInfo.provider ?? 'unknown',
        inputTokens: evaluationResult.llmTokenUsage.inputTokens,
        outputTokens: evaluationResult.llmTokenUsage.outputTokens,
      };

      // Log result summary
      this.logger.log(
        `  → Relevance: ${result.metrics.averageRelevance.toFixed(DECIMAL_PRECISION.PERCENTAGE)}/3`,
      );
      this.logger.log(
        `  → Highly Relevant: ${result.metrics.highlyRelevantCount}/${result.metrics.totalCourses}`,
      );

      records.push(result);

      // Add entry to progress
      const progressEntry: CourseRetrievalProgressEntry = {
        hash,
        question: testCase.question,
        skill: testCase.skill,
        testCaseId: testCase.id,
        completedAt: new Date().toISOString(),
        result: {
          retrievedCount: testCase.retrievedCourses.length,
          averageRelevance: evaluationResult.metrics.averageRelevance,
        },
      };

      progress.entries.push(progressEntry);
      completedSampleHashes.set(hash, progressEntry);

      // Save progress after each sample for crash recovery
      await this.resultManager.saveProgress(progress);
      this.logger.log(
        `Progress saved: ${progress.entries.length}/${testSet.cases.length} (${progress.statistics.completionPercentage.toFixed(1)}%)`,
      );
    }

    // Save records
    await this.resultManager.saveIterationRecords({
      testSetName: testSet.name,
      iterationNumber,
      records,
    });

    // Save iteration metrics (for cross-iteration aggregation)
    await this.resultManager.saveIterationMetrics({
      testSetName: testSet.name,
      iterationNumber,
      records,
    });

    // Calculate aggregated metrics across all test cases
    const allEvaluations = records.flatMap(
      (record) => record.evaluations,
    ) as EvaluationItem[];
    const metrics =
      CourseRetrievalMetricsCalculator.calculateMetrics(allEvaluations);

    const duration = Date.now() - startTime;
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`Completed ${testSet.name} iteration ${iterationNumber}`);
    this.logger.log(
      `Total duration: ${DecimalHelper.formatTime(duration / 1000)}s`,
    );
    this.logger.log(
      `Avg relevance: ${metrics.averageRelevance.toFixed(DECIMAL_PRECISION.PERCENTAGE)}/3`,
    );
    this.logger.log(
      `Highly relevant: ${metrics.highlyRelevantRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
    );
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * Generate a hash for a sample (question + skill combination)
   *
   * Uses the CourseRetrievalHashUtil to generate a unique hash based on
   * the question, skill, and optional testCaseId.
   *
   * @param params - Hash parameters
   * @returns SHA256 hash string (64 characters)
   */
  private generateSampleHash(params: CourseRetrievalHashParams): string {
    return CourseRetrievalHashUtil.generate(params);
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
      `Avg Relevance: ${evaluationResult.metrics.averageRelevance.toFixed(DECIMAL_PRECISION.PERCENTAGE)}/3`,
    );
    this.logger.log(
      `Highly Relevant: ${evaluationResult.metrics.highlyRelevantRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
    );
    this.logger.log(
      `Irrelevant: ${evaluationResult.metrics.irrelevantRate.toFixed(DECIMAL_PRECISION.RATE_COARSE)}%`,
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
}
