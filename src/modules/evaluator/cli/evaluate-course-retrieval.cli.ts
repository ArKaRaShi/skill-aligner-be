import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { FileHelper } from 'src/shared/utils/file';

import { AppModule } from '../../../app.module';
import { CourseRetrievalTestSetTransformer } from '../course-retrieval/loaders/course-retrieval-test-set-transformer.service';
import { CourseRetrievalResultManagerService } from '../course-retrieval/services/course-retrieval-result-manager.service';
import { CourseRetrievalRunnerService } from '../course-retrieval/services/course-retrieval-runner.service';
import { CourseRetrievalTestSetSerialized } from '../shared/services/test-set.types';

// ============================================================================
// TYPES
// ============================================================================

interface CliArgs {
  filename: string;
  testSetName?: string;
  iteration: number;
  aggregate?: boolean;
  totalIterations?: number;
  judgeModel?: string;
  judgeProvider?: string;
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
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      return result;
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

    if (arg === '--judge-model' && args[i + 1]) {
      result.judgeModel = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--judge-provider' && args[i + 1]) {
      result.judgeProvider = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--aggregate' || arg === '-a') {
      result.aggregate = true;
      i++;
      continue;
    }

    if (arg === '--total-iterations' && args[i + 1]) {
      const parsedTotal = Number.parseInt(args[i + 1], 10);
      if (Number.isNaN(parsedTotal) || parsedTotal < 1) {
        console.error(
          `Error: --total-iterations must be a positive integer. Got "${args[i + 1]}"`,
        );
        process.exit(1);
      }
      result.totalIterations = parsedTotal;
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

  return result;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Course Retrieval Evaluator (JSON Test Set) CLI

Usage:
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/evaluate-course-retrieval.cli.ts <filename> [OPTIONS]

Arguments:
  filename              Path to JSON test set file (relative to data/evaluation/test-sets/)

Options:
  --test-set-name <n>   Custom test set name for result grouping (default: filename without .json)
  --iteration <number>   Iteration number for results (default: 1)
  --aggregate, -a       Calculate final metrics across all iterations after evaluation
  --total-iterations <n> Total number of iterations for aggregation (required with --aggregate)
  --judge-model <model>  Judge model to use (default: from config)
  --judge-provider <p>   Judge provider to use (default: from config)
  --help, -h            Show this help message

Description:
  Evaluates course retrieval performance using LLM-as-a-Judge methodology.
  Each (question, skill) pair is evaluated by a judge LLM to assess the
  relevance of retrieved courses.

  Progress tracking is built-in - evaluations can be resumed after interruption.
  Progress is stored in:
  data/evaluation/course-retriever/<test-set-name>/progress/progress-iteration-<n>.json

  Results are saved to:
  data/evaluation/course-retriever/<test-set-name>/records/records-iteration-<n>.json

  Per-iteration metrics:
  data/evaluation/course-retriever/<test-set-name>/metrics/metrics-iteration-<n>.json

  Final aggregated metrics (with --aggregate):
  data/evaluation/course-retriever/<test-set-name>/final-metrics/final-metrics-<N>.json

Notes:
  - Each skill in a question is evaluated independently
  - Progress is tracked per (question, skill) combination using SHA256 hashes
  - Crash recovery is automatic - just re-run the same command
  - Each iteration produces separate metrics and records
  - Use --aggregate to calculate cross-iteration statistics (mean, min, max, stdDev)

Examples:
  # Load and evaluate test-set-v1.json
  bunx ts-node .../evaluate-course-retrieval.cli.ts test-set-v1.json

  # Evaluate with custom test set name
  bunx ts-node .../evaluate-course-retrieval.cli.ts test-set-v1.json --test-set-name "my-experiment"

  # Run iteration 2
  bunx ts-node .../evaluate-course-retrieval.cli.ts test-set-v1.json --iteration 2

  # Run evaluation and calculate final metrics across 3 iterations
  bunx ts-node .../evaluate-course-retrieval.cli.ts test-set-v1.json --iteration 3 --aggregate --total-iterations 3
`);
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

  const logger = new Logger('EvaluateCourseRetrievalCLI');

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('Course Retrieval Evaluator (JSON Test Set)');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log(`Filename: ${args.filename}`);
  logger.log(`Iteration: ${args.iteration}`);
  if (args.testSetName) {
    logger.log(`Test Set Name: ${args.testSetName}`);
  }
  if (args.judgeModel) {
    logger.log(`Judge Model: ${args.judgeModel}`);
  }
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    // Validate aggregate flag
    if (args.aggregate && !args.totalIterations) {
      logger.error(
        'Error: --total-iterations is required when using --aggregate',
      );
      await appContext.close();
      process.exit(1);
    }

    // Get services
    const transformer = appContext.get(CourseRetrievalTestSetTransformer);
    const runner = appContext.get(CourseRetrievalRunnerService);
    const resultManager = appContext.get(CourseRetrievalResultManagerService);

    // Determine test set name
    const testSetName = args.testSetName ?? args.filename.replace('.json', '');

    logger.log(`Loading test set "${testSetName}"...`);

    // Load raw test set from JSON
    const DEFAULT_TEST_SET_DIR = 'data/evaluation/test-sets';
    const filepath = args.filename.endsWith('.json')
      ? `${DEFAULT_TEST_SET_DIR}/${args.filename}`
      : `${DEFAULT_TEST_SET_DIR}/${args.filename}.json`;

    const serialized =
      await FileHelper.loadJson<CourseRetrievalTestSetSerialized[]>(filepath);

    if (serialized.length === 0) {
      logger.warn('No entries found in test set file.');
      await appContext.close();
      process.exit(0);
    }

    // Calculate total test cases (question + skill combinations)
    const totalSkills = serialized.reduce(
      (sum, entry) => sum + entry.skills.length,
      0,
    );

    logger.log(`Loaded ${serialized.length} query log entries`);
    logger.log(`Total (question, skill) pairs to evaluate: ${totalSkills}`);

    // Transform to test set format using transformer service
    const testSet = transformer.transformTestSet(serialized, testSetName);

    logger.log(`Transformed to ${testSet.cases.length} test cases`);

    // Run evaluation
    logger.log('Starting evaluation...');

    await runner.runTestSet({
      testSet,
      iterationNumber: args.iteration,
      judgeModel: args.judgeModel,
      judgeProvider: args.judgeProvider,
    });

    const baseDir = runner.getBaseDir();
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('Evaluation complete!');
    logger.log(
      `Results saved to: ${baseDir}/${testSetName}/records/records-iteration-${args.iteration}.json`,
    );
    logger.log(
      `Metrics saved to: ${baseDir}/${testSetName}/metrics/metrics-iteration-${args.iteration}.json`,
    );
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Calculate final metrics if --aggregate flag is provided
    if (args.aggregate && args.totalIterations) {
      logger.log('Calculating final metrics across iterations...');

      const finalMetrics = await resultManager.calculateFinalMetrics({
        testSetName,
        totalIterations: args.totalIterations,
      });

      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.log('📊 Final Metrics (Aggregated)');
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.log(`Iterations: ${finalMetrics.iterations}`);
      logger.log('');
      logger.log('NDCG (Ranking Quality):');
      logger.log(
        `  @5:  ${finalMetrics.aggregateMetrics.ndcgAt5.mean.toFixed(4)} ± ${finalMetrics.aggregateMetrics.ndcgAt5.stdDev.toFixed(4)}`,
      );
      logger.log(
        `  @10: ${finalMetrics.aggregateMetrics.ndcgAt10.mean.toFixed(4)} ± ${finalMetrics.aggregateMetrics.ndcgAt10.stdDev.toFixed(4)}`,
      );
      logger.log('');
      logger.log('Precision (% Relevant in Top K):');
      logger.log(
        `  @5:  ${finalMetrics.aggregateMetrics.precisionAt5.mean.toFixed(4)} ± ${finalMetrics.aggregateMetrics.precisionAt5.stdDev.toFixed(4)}`,
      );
      logger.log(
        `  @10: ${finalMetrics.aggregateMetrics.precisionAt10.mean.toFixed(4)} ± ${finalMetrics.aggregateMetrics.precisionAt10.stdDev.toFixed(4)}`,
      );
      logger.log('');
      logger.log(
        `Final metrics saved to: ${baseDir}/${testSetName}/final-metrics/final-metrics-${args.totalIterations}.json`,
      );
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }

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
