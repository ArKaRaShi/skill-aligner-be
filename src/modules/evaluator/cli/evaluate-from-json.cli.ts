import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { ConcurrencyLimiter } from 'src/shared/utils/concurrency-limiter.helper';

import { AppModule } from '../../../app.module';
import { EvaluationProgressTrackerService } from '../course-retrieval/evaluators/evaluation-progress-tracker.service';
import { CourseRetrievalTestSetLoaderService } from '../course-retrieval/loaders/course-retrieval-test-set-loader.service';
import { CourseRetrievalResultManagerService } from '../course-retrieval/services/course-retrieval-result-manager.service';
import { I_COURSE_RETRIEVAL_RUNNER_TOKEN } from '../course-retrieval/services/course-retrieval-runner.service';
import { CourseRetrievalRunnerService } from '../course-retrieval/services/course-retrieval-runner.service';
import type { EvaluateRetrieverOutput } from '../course-retrieval/types/course-retrieval.types';
import type { EvaluateRetrieverInput } from '../course-retrieval/types/course-retrieval.types';

// ============================================================================
// TYPES
// ============================================================================

interface CliArgs {
  filename: string;
  queryLogId?: string;
  skill?: string;
  outputDir?: string;
  testSetName?: string;
  iteration: number; // Always set, defaults to 1
  resume: boolean; // Skip already-completed evaluations
  resetProgress: boolean; // Reset progress file for this iteration
  help: boolean;
}

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

/**
 * Parse command line arguments
 * @returns Parsed arguments object
 */
function parseArgs(): CliArgs | null {
  const args = process.argv.slice(2);

  // Show help if no arguments provided
  if (args.length === 0) {
    showHelp();
    return null;
  }

  const result: CliArgs = {
    filename: '',
    iteration: 1,
    resume: false,
    resetProgress: false,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      return result;
    }

    if (arg === '--resume') {
      result.resume = true;
      i++;
      continue;
    }

    if (arg === '--reset-progress') {
      result.resetProgress = true;
      i++;
      continue;
    }

    if (arg === '--query-log-id' && args[i + 1]) {
      result.queryLogId = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--skill' && args[i + 1]) {
      result.skill = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--output-dir' && args[i + 1]) {
      result.outputDir = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--test-set-name' && args[i + 1]) {
      result.testSetName = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--iteration' && args[i + 1]) {
      const parsedIteration = Number.parseInt(args[i + 1], 10);
      if (Number.isNaN(parsedIteration) || parsedIteration < 1) {
        console.error(
          `Error: --iteration must be a positive integer. Got "${args[i + 1]}"`,
        );
        process.exit(1);
      }
      result.iteration = parsedIteration;
      i += 2;
      continue;
    }

    // Positional argument (filename)
    if (!arg.startsWith('--')) {
      result.filename = arg;
      i++;
      continue;
    }

    console.error(`Error: Unknown argument "${arg}"`);
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Validate required arguments
  if (!result.filename) {
    console.error('Error: Filename is required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Validate that --skill requires --query-log-id
  if (result.skill && !result.queryLogId) {
    console.error('Error: --skill requires --query-log-id');
    process.exit(1);
  }

  return result;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Course Retriever Evaluator (JSON Test Set) CLI

Usage:
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/evaluate-from-json.cli.ts <filename> [OPTIONS]

Arguments:
  filename              Path to JSON test set file (relative to data/evaluation/test-sets/)

Options:
  --query-log-id <id>   Filter to specific queryLogId
  --skill <name>        Filter to specific skill (requires --query-log-id)
  --test-set-name <n>   Custom test set name for result grouping (default: filename without .json)
  --iteration <number>  Iteration number for results (default: 1)
  --resume              Skip already-completed evaluations (resumable mode)
  --reset-progress      Reset progress file for this iteration (start fresh)
  --help, -h            Show this help message

Evaluation Modes:
  1. All skills from all entries:
     bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json

  2. All skills from specific queryLogId:
     bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json --query-log-id "abc123"

  3. Specific skill from specific queryLogId:
     bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json --query-log-id "abc123" --skill "data analysis"

Resumable Evaluation:
  - Use --resume to skip already-completed evaluations after a crash/interruption
  - Progress is tracked in .progress.json file in the iteration directory
  - Use --reset-progress to start fresh (deletes progress file)

Notes:
  - Evaluations are processed per question with concurrency control (2 skills at a time)
  - Each skill is evaluated independently with its own set of retrieved courses
  - Results are saved to data/evaluation/course-retriever/<test-set-name>/iteration-<n>/

Examples:
  # Load and evaluate all skills from test-set-v1.json
  bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json

  # Resume evaluation after crash (skip completed)
  bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json --resume

  # Reset progress and start fresh
  bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json --reset-progress

  # Evaluate specific skill with custom test set name
  bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json --query-log-id "abc123" --skill "python" --test-set-name "my-experiment"
`);
}

// ============================================================================
// METRICS HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate average relevance score from evaluation results
 * @param records - Array of evaluation results
 * @returns Average relevance score (0-3)
 */
function calculateAverageRelevance(records: EvaluateRetrieverOutput[]): number {
  if (records.length === 0) return 0;

  const totalRelevance = records.reduce((sum, record) => {
    return sum + record.metrics.averageRelevance;
  }, 0);

  return totalRelevance / records.length;
}

/**
 * Calculate the rate of highly relevant courses (score = 3)
 * @param records - Array of evaluation results
 * @returns Percentage of highly relevant courses (0-1)
 */
function calculateHighlyRelevantRate(
  records: EvaluateRetrieverOutput[],
): number {
  if (records.length === 0) return 0;

  let totalCourses = 0;
  let highlyRelevantCount = 0;

  for (const record of records) {
    totalCourses += record.metrics.totalCourses;
    highlyRelevantCount += record.metrics.highlyRelevantCount;
  }

  return totalCourses > 0 ? highlyRelevantCount / totalCourses : 0;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function bootstrap() {
  const args = parseArgs();

  if (!args) {
    process.exit(0);
  }

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  const logger = new Logger('EvaluateFromJsonCLI');

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('Course Retriever Evaluator (JSON Test Set)');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log(`Filename: ${args.filename}`);
  if (args.queryLogId) {
    logger.log(`QueryLog ID: ${args.queryLogId}`);
  }
  if (args.skill) {
    logger.log(`Skill: ${args.skill}`);
  }
  logger.log(`Iteration: ${args.iteration}`);
  logger.log(`Resume mode: ${args.resume ? 'ON' : 'OFF'}`);
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get services
    const loader = appContext.get(CourseRetrievalTestSetLoaderService);
    const runner = appContext.get<CourseRetrievalRunnerService>(
      I_COURSE_RETRIEVAL_RUNNER_TOKEN,
    );
    const resultManager = appContext.get(CourseRetrievalResultManagerService);
    const progressTracker = appContext.get(EvaluationProgressTrackerService);

    const testSetName = args.testSetName ?? args.filename.replace('.json', '');

    // Handle reset progress flag
    if (args.resetProgress) {
      logger.log('Resetting progress file...');
      await progressTracker.resetProgress({
        testSetName,
        iterationNumber: args.iteration,
      });
      logger.log('Progress reset complete');
    }

    // Load test set from JSON
    logger.log(`Loading test set "${testSetName}"...`);

    const evaluatorInputs = await loader.loadForEvaluator(
      args.filename,
      undefined,
      {
        queryLogId: args.queryLogId,
        skill: args.skill,
      },
    );

    if (evaluatorInputs.length === 0) {
      logger.warn('No evaluator inputs found. Check your filters.');
      await appContext.close();
      process.exit(0);
    }

    logger.log(`Loaded ${evaluatorInputs.length} evaluator inputs`);

    // Filter out already-completed evaluations if resume mode is enabled
    let inputsToProcess = evaluatorInputs;
    let previouslyCompleted: EvaluateRetrieverInput[] = [];
    let progressFile = await progressTracker.loadProgress({
      testSetName,
      iterationNumber: args.iteration,
    });

    if (args.resume) {
      logger.log('Resume mode: filtering completed evaluations...');
      const filtered = await progressTracker.filterCompleted({
        inputs: evaluatorInputs,
        testSetName,
        iterationNumber: args.iteration,
      });
      inputsToProcess = filtered.pending;
      previouslyCompleted = filtered.completed;
      progressFile = filtered.progress;

      logger.log(`Previously completed: ${previouslyCompleted.length}`);
      logger.log(`Remaining to process: ${inputsToProcess.length}`);

      if (inputsToProcess.length === 0) {
        logger.log(
          'All evaluations already completed! Loading existing results...',
        );
        const existingResults = await progressTracker.loadCompletedResults({
          progress: progressFile,
        });

        // Show basic metrics for existing results
        if (existingResults.length > 0) {
          const avgRelevance = calculateAverageRelevance(
            existingResults as EvaluateRetrieverOutput[],
          );
          const highlyRelevantRate = calculateHighlyRelevantRate(
            existingResults as EvaluateRetrieverOutput[],
          );

          logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          logger.log('Existing Evaluation Results:');
          logger.log(`  Total evaluations: ${existingResults.length}`);
          logger.log(`  Average relevance: ${avgRelevance.toFixed(2)}/3`);
          logger.log(
            `  Highly relevant rate: ${(highlyRelevantRate * 100).toFixed(1)}%`,
          );
          logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }

        await appContext.close();
        process.exit(0);
      }
    }

    if (args.resume && inputsToProcess.length > 0) {
      logger.log(
        `Continuing with ${inputsToProcess.length} pending evaluations`,
      );
    }

    logger.log('Starting evaluation (concurrent per question)...');

    // Group evaluator inputs by testCaseId
    const groupedByTestCase = new Map<string, EvaluateRetrieverInput[]>();
    for (const input of inputsToProcess) {
      const key = input.testCaseId ?? 'ungrouped';
      if (!groupedByTestCase.has(key)) {
        groupedByTestCase.set(key, []);
      }
      groupedByTestCase.get(key)!.push(input);
    }

    logger.log(`Grouped into ${groupedByTestCase.size} test cases`);

    // Run evaluations per testCaseId with concurrency control
    const results: EvaluateRetrieverOutput[] = [];
    let globalIndex = 0;

    for (const [testCaseId, inputs] of groupedByTestCase) {
      logger.log(
        `Processing testCaseId "${testCaseId}" with ${inputs.length} skills...`,
      );

      // Create concurrency limiter for this group (limit=2)
      const limiter = new ConcurrencyLimiter(2);

      // Process all skills in this group with concurrency=2
      const groupResults = await Promise.all(
        inputs.map((input) =>
          limiter.add(async () => {
            globalIndex++;
            const totalIndex = args.resume
              ? globalIndex + previouslyCompleted.length
              : globalIndex;
            const progress = `[${totalIndex}/${evaluatorInputs.length}]`;
            logger.log(
              `${progress} Evaluating: skill="${input.skill}" testCaseId="${input.testCaseId}"`,
            );

            const result = await runner.runEvaluator(
              {
                iterationNumber: args.iteration,
                prefixDir: testSetName,
              },
              input,
            );

            // Mark as completed in progress file
            if (args.resume) {
              const resultFileName = `evaluation-${Date.now()}.json`;
              const resultFilePath = `${testSetName}/iteration-${args.iteration}/${resultFileName}`;
              await progressTracker.markCompleted({
                progress: progressFile,
                input,
                resultFile: resultFilePath,
              });
            }

            return result;
          }),
        ),
      );

      results.push(...groupResults);
      logger.log(`Completed testCaseId "${testCaseId}"`);
    }

    // Combine with previously completed results if in resume mode
    const allResults = args.resume
      ? [
          ...(await progressTracker.loadCompletedResults({
            progress: progressFile,
          })),
          ...results,
        ]
      : results;

    // Save results and show basic metrics if we have results
    if (allResults.length > 0) {
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.log('Saving results...');

      // Save all iteration records at once
      await resultManager.saveIterationRecords({
        testSetName,
        iterationNumber: args.iteration,
        records: allResults as EvaluateRetrieverOutput[],
      });

      // Calculate and display basic metrics
      const avgRelevance = calculateAverageRelevance(
        allResults as EvaluateRetrieverOutput[],
      );
      const highlyRelevantRate = calculateHighlyRelevantRate(
        allResults as EvaluateRetrieverOutput[],
      );
      const uniqueTestCases = new Set(
        (allResults as EvaluateRetrieverOutput[]).map((r) => r.question),
      ).size;

      logger.log(`Saved ${allResults.length} evaluation records`);
      logger.log(`  Unique test cases: ${uniqueTestCases}`);
      logger.log(`  Average relevance: ${avgRelevance.toFixed(2)}/3`);
      logger.log(
        `  Highly relevant rate: ${(highlyRelevantRate * 100).toFixed(1)}%`,
      );

      logger.log('Results saved successfully!');
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

    const baseDir = runner.getBaseDir();
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('Evaluation complete!');
    logger.log(
      `Results saved to: ${baseDir}/${testSetName}/iteration-${args.iteration}/`,
    );
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await appContext.close();
    process.exit(0);
  } catch (error) {
    logger.error('CLI task failed:', error);
    await appContext.close();
    process.exit(1);
  }
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

void bootstrap();
