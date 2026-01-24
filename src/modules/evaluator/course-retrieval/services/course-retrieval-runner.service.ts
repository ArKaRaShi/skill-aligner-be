import { Injectable, Logger } from '@nestjs/common';

import * as path from 'node:path';
import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
import { DecimalHelper } from 'src/shared/utils/decimal.helper';
import { FileHelper } from 'src/shared/utils/file';

import { IRunEvaluator } from '../../shared/contracts/i-run-evaluator.contract';
import { CourseRetrieverEvaluator } from '../evaluators/course-retriever.evaluator';
import {
  EvaluateRetrieverInput,
  EvaluateRetrieverOutput,
  EvaluationItem,
  RunTestSetInput,
} from '../types/course-retrieval.types';
import { CourseRetrievalMetricsCalculator } from './course-retrieval-metrics-calculator.service';
import { CourseRetrievalResultManagerService } from './course-retrieval-result-manager.service';

export const I_COURSE_RETRIEVAL_RUNNER_TOKEN = 'ICourseRetrievalRunnerService';

/**
 * Additional context for course retriever evaluations
 */
export type CourseRetrievalEvaluationContext = {
  iterationNumber?: number;
  prefixDir?: string;
};

/**
 * Service for running course retrieval evaluations.
 *
 * Implements the generic IRunEvaluator contract specifically for course retrieval evaluations.
 * Handles pipeline execution, result persistence, and file organization.
 *
 * @implements IRunEvaluator<EvaluateRetrieverInput, EvaluateRetrieverOutput, CourseRetrievalEvaluationContext>
 *
 * @deprecated This will be updated to not implement IRunEvaluator in Phase 10.
 * The modern evaluator pattern uses direct class injection instead of contract-based tokens.
 */
@Injectable()
export class CourseRetrievalRunnerService
  implements
    IRunEvaluator<
      EvaluateRetrieverInput,
      EvaluateRetrieverOutput,
      CourseRetrievalEvaluationContext
    >
{
  private readonly logger = new Logger(CourseRetrievalRunnerService.name);
  private readonly baseDir = 'data/evaluation/course-retriever';

  constructor(
    private readonly evaluator: CourseRetrieverEvaluator,
    private readonly resultManager: CourseRetrievalResultManagerService,
  ) {}

  /**
   * Run a complete test set with multiple test cases
   *
   * This is the main entry point for running batch evaluations.
   * Iterates through all test cases, collects results, calculates metrics,
   * and saves everything using the result manager.
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

    // Run each test case
    const records: EvaluateRetrieverOutput[] = [];
    for (let i = 0; i < testSet.cases.length; i++) {
      const testCase = testSet.cases[i];
      const progress = `[${i + 1}/${testSet.cases.length}]`;

      this.logger.log(`${progress} Running: ${testCase.id}`);
      this.logger.log(`  Question: "${testCase.question}"`);
      this.logger.log(`  Skill: "${testCase.skill}"`);
      this.logger.log(`  Courses: ${testCase.retrievedCourses.length}`);

      // Run evaluation for this test case
      const evaluationResult = await this.evaluator.evaluate({
        question: testCase.question,
        skill: testCase.skill,
        retrievedCourses: testCase.retrievedCourses,
      });

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
    }

    // Save records
    await this.resultManager.saveIterationRecords({
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
    const evaluationResult = await this.evaluator.evaluate({
      question: input.question,
      skill: input.skill,
      retrievedCourses: input.retrievedCourses,
    });

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
