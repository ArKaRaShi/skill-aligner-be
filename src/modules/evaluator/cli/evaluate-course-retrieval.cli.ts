import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import Table from 'cli-table3';
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
  iteration?: number;
  iterations?: number;
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

    if (arg === '--iterations' && args[i + 1]) {
      const parsedIterations = Number.parseInt(args[i + 1], 10);
      if (Number.isNaN(parsedIterations) || parsedIterations < 1) {
        console.error(
          `Error: --iterations must be a positive integer. Got "${args[i + 1]}"`,
        );
        process.exit(1);
      }
      result.iterations = parsedIterations;
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
  --iteration <number>   Run a single iteration (default: 1)
  --iterations <n>       Run N iterations with auto-aggregation (alternative to --iteration)
  --aggregate, -a       Calculate final metrics across all iterations (only with --iteration mode)
  --total-iterations <n> Total number of iterations for aggregation (required with --aggregate)
  --judge-model <model>  Judge model to use (default: from config)
  --judge-provider <p>   Judge provider to use (default: from config)
  --help, -h            Show this help message

Description:
  Evaluates course retrieval performance using LLM-as-a-Judge methodology.
  Each (question, skill) pair is evaluated by a judge LLM to assess the
  relevance of retrieved courses.

Two Modes:
  --iteration N (default): Run single iteration N. Use --aggregate with --total-iterations
                          to calculate final metrics across multiple iterations.
  --iterations N:         Run N iterations in one go with automatic final metrics aggregation.

Progress tracking is built-in - evaluations can be resumed after interruption.
Progress is stored in:
  data/evaluation/course-retriever/<test-set-name>/progress/progress-iteration-<n>.json

Results are saved to:
  data/evaluation/course-retriever/<test-set-name>/records/records-iteration-<n>.json

Per-iteration metrics:
  data/evaluation/course-retriever/<test-set-name>/metrics/metrics-iteration-<n>.json

Per-iteration cost:
  data/evaluation/course-retriever/<test-set-name>/cost/cost-iteration-<n>.json

Final aggregated metrics (auto with --iterations or with --aggregate):
  data/evaluation/course-retriever/<test-set-name>/final-metrics/final-metrics-<N>.json

Final aggregated cost (auto with --iterations or with --aggregate):
  data/evaluation/course-retriever/<test-set-name>/final-cost/final-cost-<N>.json

Notes:
  - Each skill in a question is evaluated independently
  - Progress is tracked per (question, skill) combination using SHA256 hashes
  - Crash recovery is automatic - just re-run the same command
  - Each iteration produces separate metrics and records
  - --iterations mode automatically calculates final metrics and cost after all iterations

Examples:
  # Load and evaluate test-set-v1.json (single iteration)
  bunx ts-node .../evaluate-course-retrieval.cli.ts test-set-v1.json

  # Evaluate with custom test set name
  bunx ts-node .../evaluate-course-retrieval.cli.ts test-set-v1.json --test-set-name "my-experiment"

  # Run iteration 2
  bunx ts-node .../evaluate-course-retrieval.cli.ts test-set-v1.json --iteration 2

  # Run 3 iterations with auto-aggregation (recommended)
  bunx ts-node .../evaluate-course-retrieval.cli.ts test-set-v1.json --iterations 3

  # Run evaluation and manually calculate final metrics across 3 iterations (legacy mode)
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

  // Validate mutually exclusive flags
  if (args.iteration !== undefined && args.iterations !== undefined) {
    logger.error(
      'Error: --iteration and --iterations are mutually exclusive. Use --iteration N for a single iteration or --iterations N to run N iterations with auto-aggregation.',
    );
    process.exit(1);
  }

  if (args.iteration !== undefined) {
    logger.log(`Iteration: ${args.iteration} (single iteration mode)`);
  } else if (args.iterations !== undefined) {
    logger.log(
      `Iterations: ${args.iterations} (multi-iteration mode with auto-aggregation)`,
    );
  }

  if (args.testSetName) {
    logger.log(`Test Set Name: ${args.testSetName}`);
  }
  if (args.judgeModel) {
    logger.log(`Judge Model: ${args.judgeModel}`);
  }
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    // Validate aggregate flag (only valid with --iteration mode)
    if (args.aggregate && args.iterations !== undefined) {
      logger.error(
        'Error: --aggregate is only valid with --iteration mode. In --iterations mode, final metrics are calculated automatically.',
      );
      await appContext.close();
      process.exit(1);
    }

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

    // Run evaluation based on mode
    if (args.iterations !== undefined) {
      // Multi-iteration mode: run all iterations, then auto-aggregate
      logger.log('Starting evaluation...');
      logger.log(
        `Running ${args.iterations} iteration(s) with auto-aggregation...`,
      );

      for (let iter = 1; iter <= args.iterations; iter++) {
        logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        logger.log(`Starting iteration ${iter}/${args.iterations}`);
        logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

        await runner.runTestSet({
          testSet,
          iterationNumber: iter,
          judgeModel: args.judgeModel,
          judgeProvider: args.judgeProvider,
        });
      }

      const baseDir = runner.getBaseDir();
      logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      logger.log('All iterations complete!');
      logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      // Auto-calculate and save final metrics
      logger.log('Auto-calculating final metrics across iterations...');

      const finalMetrics = await resultManager.calculateFinalMetrics({
        testSetName,
        totalIterations: args.iterations,
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
      logger.log(
        `  @15: ${finalMetrics.aggregateMetrics.ndcgAt15.mean.toFixed(4)} ± ${finalMetrics.aggregateMetrics.ndcgAt15.stdDev.toFixed(4)}`,
      );
      logger.log('');
      displayMultiThresholdPrecision(finalMetrics);
      logger.log(
        `Final metrics saved to: ${baseDir}/${testSetName}/final-metrics/final-metrics-${args.iterations}.json`,
      );
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Auto-calculate and save final cost
      logger.log('Auto-calculating final cost across iterations...');

      const finalCost = await resultManager.calculateFinalCost({
        testSetName,
        totalIterations: args.iterations,
        judgeModel: args.judgeModel ?? 'gpt-4o',
        judgeProvider: args.judgeProvider ?? 'openai',
      });

      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.log('💰 Final Cost (Aggregated)');
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.log(`Total Samples: ${finalCost.aggregateStats.totalSamples}`);
      logger.log(
        `Total Evaluations: ${finalCost.aggregateStats.totalEvaluations}`,
      );
      logger.log(
        `Total Tokens: ${finalCost.aggregateStats.totalTokens.total} (input: ${finalCost.aggregateStats.totalTokens.input}, output: ${finalCost.aggregateStats.totalTokens.output})`,
      );
      logger.log(
        `Total Cost: $${finalCost.aggregateStats.totalCost.toFixed(6)}`,
      );
      logger.log(
        `Avg Cost/Sample: $${finalCost.aggregateStats.averageCostPerSample.toFixed(6)}`,
      );
      logger.log(
        `Avg Cost/Evaluation: $${finalCost.aggregateStats.averageCostPerEvaluation.toFixed(6)}`,
      );
      logger.log(
        `Final cost saved to: ${baseDir}/${testSetName}/final-cost/final-cost-${args.iterations}.json`,
      );
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      // Single iteration mode
      const currentIteration = args.iteration ?? 1;
      logger.log('Starting evaluation...');

      await runner.runTestSet({
        testSet,
        iterationNumber: currentIteration,
        judgeModel: args.judgeModel,
        judgeProvider: args.judgeProvider,
      });

      const baseDir = runner.getBaseDir();
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.log('Evaluation complete!');
      logger.log(
        `Results saved to: ${baseDir}/${testSetName}/records/records-iteration-${currentIteration}.json`,
      );
      logger.log(
        `Metrics saved to: ${baseDir}/${testSetName}/metrics/metrics-iteration-${currentIteration}.json`,
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
        logger.log(
          `  @15: ${finalMetrics.aggregateMetrics.ndcgAt15.mean.toFixed(4)} ± ${finalMetrics.aggregateMetrics.ndcgAt15.stdDev.toFixed(4)}`,
        );
        logger.log('');
        displayMultiThresholdPrecision(finalMetrics);
        logger.log(
          `Final metrics saved to: ${baseDir}/${testSetName}/final-metrics/final-metrics-${args.totalIterations}.json`,
        );
        logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Calculate and save final cost
        logger.log('Calculating final cost across iterations...');

        const finalCost = await resultManager.calculateFinalCost({
          testSetName,
          totalIterations: args.totalIterations,
          judgeModel: args.judgeModel ?? 'gpt-4o',
          judgeProvider: args.judgeProvider ?? 'openai',
        });

        logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.log('💰 Final Cost (Aggregated)');
        logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.log(`Total Samples: ${finalCost.aggregateStats.totalSamples}`);
        logger.log(
          `Total Evaluations: ${finalCost.aggregateStats.totalEvaluations}`,
        );
        logger.log(
          `Total Tokens: ${finalCost.aggregateStats.totalTokens.total} (input: ${finalCost.aggregateStats.totalTokens.input}, output: ${finalCost.aggregateStats.totalTokens.output})`,
        );
        logger.log(
          `Total Cost: $${finalCost.aggregateStats.totalCost.toFixed(6)}`,
        );
        logger.log(
          `Avg Cost/Sample: $${finalCost.aggregateStats.averageCostPerSample.toFixed(6)}`,
        );
        logger.log(
          `Avg Cost/Evaluation: $${finalCost.aggregateStats.averageCostPerEvaluation.toFixed(6)}`,
        );
        logger.log(
          `Final cost saved to: ${baseDir}/${testSetName}/final-cost/final-cost-${args.totalIterations}.json`,
        );
        logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      }
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
// MULTI-THRESHOLD PRECISION DISPLAY
// ============================================================================

/**
 * Format precision value as percentage with stdDev
 */
function formatPrecision(mean: number, stdDev: number): string {
  return `${(mean * 100).toFixed(2)}% ± ${(stdDev * 100).toFixed(2)}%`;
}

/**
 * Display multi-threshold precision metrics using cli-table3
 *
 * Shows precision at three relevance levels (≥1, ≥2, ≥3) for each cut-off position.
 *
 * @param finalMetrics - Final metrics containing multi-threshold precision
 */
function displayMultiThresholdPrecision(
  finalMetrics: Awaited<
    ReturnType<CourseRetrievalResultManagerService['calculateFinalMetrics']>
  >,
): void {
  const { aggregateMetrics } = finalMetrics;

  // Create precision table
  const precisionTable = new Table({
    head: ['Cut-off', '≥1 (Lenient)', '≥2 (Standard)', '≥3 (Strict)'],
    colAligns: ['left', 'right', 'right', 'right'],
    style: {
      head: ['cyan', 'bold'],
      border: ['grey'],
    },
  });

  // Add rows for each K value
  const kValues = [
    { k: 5, label: '@5' },
    { k: 10, label: '@10' },
    { k: 15, label: '@15' },
    { k: 0, label: '@All' },
  ];

  for (const { k, label } of kValues) {
    let metrics:
      | typeof aggregateMetrics.precisionAt5
      | typeof aggregateMetrics.precisionAt10
      | typeof aggregateMetrics.precisionAt15
      | typeof aggregateMetrics.precisionAtAll;
    if (k === 5) {
      metrics = aggregateMetrics.precisionAt5;
    } else if (k === 10) {
      metrics = aggregateMetrics.precisionAt10;
    } else if (k === 15) {
      metrics = aggregateMetrics.precisionAt15;
    } else {
      metrics = aggregateMetrics.precisionAtAll;
    }

    precisionTable.push([
      label,
      formatPrecision(metrics.threshold1.mean, metrics.threshold1.stdDev),
      formatPrecision(metrics.threshold2.mean, metrics.threshold2.stdDev),
      formatPrecision(metrics.threshold3.mean, metrics.threshold3.stdDev),
    ]);
  }

  console.log('');
  console.log('Precision (% Relevant in Top K):');
  console.log(precisionTable.toString());
  console.log('');
  console.log('Threshold Legend:');
  console.log('  ≥1 (Lenient):   Score ≥ 1 - "At least slightly relevant"');
  console.log(
    '  ≥2 (Standard):  Score ≥ 2 - "Fairly or highly relevant" ← PRIMARY',
  );
  console.log('  ≥3 (Strict):    Score ≥ 3 - "Highly relevant only"');
  console.log('');
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

void bootstrap();
