import { Injectable, Logger } from '@nestjs/common';

import * as path from 'node:path';
import { FileHelper } from 'src/shared/utils/file';

import { IRunEvaluator } from '../../shared/contracts/i-run-evaluator.contract';
import { CourseRetrieverEvaluator } from '../evaluators/course-retriever.evaluator';
import { EvaluationResultManagerService } from '../evaluators/evaluation-result-manager.service';
import { RunTestSetInput } from '../test-sets/test-set.type';
import {
  EvaluateRetrieverInput,
  EvaluateRetrieverOutput,
} from '../types/course-retrieval.types';

export const I_COURSE_RETRIEVER_EVALUATION_RUNNER_TOKEN =
  'ICourseRetrieverEvaluationRunnerService';

/**
 * Additional context for course retriever evaluations
 */
export type CourseRetrieverEvaluationContext = {
  iterationNumber?: number;
  prefixDir?: string;
};

/**
 * Service for running course retriever evaluations.
 *
 * Implements the generic IRunEvaluator contract specifically for course retriever evaluations.
 * Handles pipeline execution, result persistence, and file organization.
 *
 * @implements IRunEvaluator<EvaluateRetrieverInput, EvaluateRetrieverOutput, CourseRetrieverEvaluationContext>
 */
@Injectable()
export class CourseRetrieverEvaluationRunnerService
  implements
    IRunEvaluator<
      EvaluateRetrieverInput,
      EvaluateRetrieverOutput,
      CourseRetrieverEvaluationContext
    >
{
  private readonly logger = new Logger(
    CourseRetrieverEvaluationRunnerService.name,
  );
  private readonly baseDir = 'data/evaluation/course-retriever';

  constructor(
    private readonly evaluator: CourseRetrieverEvaluator,
    private readonly resultManager: EvaluationResultManagerService,
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
        `Avg Skill Relevance: ${evaluationResult.metrics.averageSkillRelevance.toFixed(2)}/3`,
      );
      this.logger.log(
        `Avg Context Alignment: ${evaluationResult.metrics.averageContextAlignment.toFixed(2)}/3`,
      );
      this.logger.log(
        `Alignment Gap: ${evaluationResult.metrics.alignmentGap.toFixed(2)}`,
      );
      this.logger.log(
        `Context Mismatch Rate: ${evaluationResult.metrics.contextMismatchRate.toFixed(1)}%`,
      );

      if (evaluationResult.metrics.contextMismatchCourses.length > 0) {
        this.logger.warn(
          `Found ${evaluationResult.metrics.contextMismatchCourses.length} context mismatches:`,
        );
        evaluationResult.metrics.contextMismatchCourses.forEach((mismatch) => {
          this.logger.warn(
            `  - ${mismatch.courseCode}: Skill=${mismatch.skillRelevance}, Context=${mismatch.contextAlignment}`,
          );
        });
      }

      const result: EvaluateRetrieverOutput = {
        testCaseId: testCase.id,
        question: evaluationResult.question,
        skill: evaluationResult.skill,
        retrievedCount: testCase.retrievedCourses.length,
        evaluations: evaluationResult.evaluations,
        metrics: {
          averageSkillRelevance: evaluationResult.metrics.averageSkillRelevance,
          averageContextAlignment:
            evaluationResult.metrics.averageContextAlignment,
          alignmentGap: evaluationResult.metrics.alignmentGap,
          contextMismatchRate: evaluationResult.metrics.contextMismatchRate,
          contextMismatchCourses:
            evaluationResult.metrics.contextMismatchCourses,
        },
        llmModel: evaluationResult.llmInfo.model,
        llmProvider: evaluationResult.llmInfo.provider ?? 'unknown',
        inputTokens: evaluationResult.llmTokenUsage.inputTokens,
        outputTokens: evaluationResult.llmTokenUsage.outputTokens,
      };

      // Log result summary
      this.logger.log(
        `  → Skill Relevance: ${result.metrics.averageSkillRelevance.toFixed(2)}/3`,
      );
      this.logger.log(
        `  → Context Alignment: ${result.metrics.averageContextAlignment.toFixed(2)}/3`,
      );
      this.logger.log(
        `  → Mismatches: ${result.metrics.contextMismatchCourses.length}`,
      );

      records.push(result);
    }

    // Save records
    await this.resultManager.saveIterationRecords({
      testSetName: testSet.name,
      iterationNumber,
      records,
    });

    // Calculate and save enhanced metrics with three-level aggregation
    const metrics = this.resultManager.calculateIterationMetrics({
      iterationNumber,
      records,
    });

    // Save iteration metrics (includes test case breakdown)
    await this.resultManager.saveIterationMetrics({
      testSetName: testSet.name,
      iterationNumber,
      metrics,
    });

    // Save test case metrics separately for detailed analysis
    await this.resultManager.saveTestCaseMetrics({
      testSetName: testSet.name,
      iterationNumber,
      testCaseMetrics: metrics.testCaseMetrics,
    });

    // Extract and save context mismatches
    const mismatches = this.resultManager.extractContextMismatches({
      records,
      iterationNumber,
    });
    if (mismatches.length > 0) {
      await this.resultManager.saveContextMismatches({
        testSetName: testSet.name,
        mismatches,
      });
    }

    const duration = Date.now() - startTime;
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.logger.log(`Completed ${testSet.name} iteration ${iterationNumber}`);
    this.logger.log(`Total duration: ${(duration / 1000).toFixed(2)}s`);
    this.logger.log(
      `Macro avg skill relevance: ${metrics.macroAvg.averageSkillRelevance}/3`,
    );
    this.logger.log(
      `Micro avg skill relevance: ${metrics.microAvg.averageSkillRelevance}/3`,
    );
    this.logger.log(
      `Macro avg context alignment: ${metrics.macroAvg.averageContextAlignment}/3`,
    );
    this.logger.log(
      `Micro avg context alignment: ${metrics.microAvg.averageContextAlignment}/3`,
    );
    this.logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * Run complete course retriever evaluation workflow
   *
   * @param context - Evaluation context (iteration number, prefix directory)
   * @param input - Pipeline input parameters
   * @returns Pipeline execution output with evaluation results
   */
  async runEvaluator(
    context: CourseRetrieverEvaluationContext,
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
      `Avg Skill Relevance: ${evaluationResult.metrics.averageSkillRelevance.toFixed(2)}/3`,
    );
    this.logger.log(
      `Avg Context Alignment: ${evaluationResult.metrics.averageContextAlignment.toFixed(2)}/3`,
    );
    this.logger.log(
      `Alignment Gap: ${evaluationResult.metrics.alignmentGap.toFixed(2)}`,
    );
    this.logger.log(
      `Context Mismatch Rate: ${evaluationResult.metrics.contextMismatchRate.toFixed(1)}%`,
    );

    if (evaluationResult.metrics.contextMismatchCourses.length > 0) {
      this.logger.warn(
        `Found ${evaluationResult.metrics.contextMismatchCourses.length} context mismatches:`,
      );
      evaluationResult.metrics.contextMismatchCourses.forEach((mismatch) => {
        this.logger.warn(
          `  - ${mismatch.courseCode}: Skill=${mismatch.skillRelevance}, Context=${mismatch.contextAlignment}`,
        );
      });
    }

    const result: EvaluateRetrieverOutput = {
      testCaseId: input.testCaseId,
      question: evaluationResult.question,
      skill: evaluationResult.skill,
      retrievedCount: input.retrievedCourses.length,
      evaluations: evaluationResult.evaluations,
      metrics: {
        averageSkillRelevance: evaluationResult.metrics.averageSkillRelevance,
        averageContextAlignment:
          evaluationResult.metrics.averageContextAlignment,
        alignmentGap: evaluationResult.metrics.alignmentGap,
        contextMismatchRate: evaluationResult.metrics.contextMismatchRate,
        contextMismatchCourses: evaluationResult.metrics.contextMismatchCourses,
      },
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
   * Creates three types of files:
   * 1. Timestamped evaluation file (e.g., evaluation-1234567890.json)
   * 2. Latest evaluation file (latest.json)
   * 3. Context mismatches file (appended if mismatches exist)
   *
   * @param result - The evaluation result to save
   * @param duration - Duration of evaluation in milliseconds
   * @param context - Additional evaluation context
   */
  async saveResults(
    result: EvaluateRetrieverOutput,
    duration: number,
    context: CourseRetrieverEvaluationContext,
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

    // Save context mismatches separately if any exist
    if (result.metrics.contextMismatchCourses.length > 0) {
      const mismatchesFile = path.join(this.baseDir, 'context-mismatches.json');
      const mismatchEntry = {
        timestamp: new Date(timestamp).toISOString(),
        question: result.question,
        skill: result.skill,
        retrievedCount: result.retrievedCount,
        mismatches: result.metrics.contextMismatchCourses,
        iterationNumber: context?.iterationNumber,
      };
      await FileHelper.appendToJsonArray(mismatchesFile, mismatchEntry);
      this.logger.log(
        `Saved ${result.metrics.contextMismatchCourses.length} context mismatches`,
      );
    }

    this.logger.log(`Results saved to: ${outputPath}`);
  }

  /**
   * Get the base directory path for course retriever evaluations
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
    context: CourseRetrieverEvaluationContext = {},
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
          courseCode: 'CS101',
          courseName: 'Introduction to Programming',
          cleanedLearningOutcomes: [
            'Understand basic programming concepts',
            'Learn Python syntax and semantics',
            'Write simple programs using loops and conditionals',
          ],
        },
        {
          courseCode: 'CS201',
          courseName: 'Advanced Python',
          cleanedLearningOutcomes: [
            'Master object-oriented programming in Python',
            'Work with files and databases',
            'Build web applications using Flask',
          ],
        },
        {
          courseCode: 'CS301',
          courseName: 'Data Structures',
          cleanedLearningOutcomes: [
            'Understand arrays, linked lists, and trees',
            'Implement sorting and searching algorithms',
            'Analyze algorithm complexity',
          ],
        },
        {
          courseCode: 'MATH101',
          courseName: 'Calculus I',
          cleanedLearningOutcomes: [
            'Understand limits and derivatives',
            'Learn integration techniques',
            'Apply calculus to real-world problems',
          ],
        },
        {
          courseCode: 'CS401',
          courseName: 'Machine Learning',
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
