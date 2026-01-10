import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { ConcurrencyLimiter } from 'src/shared/utils/concurrency-limiter.helper';

import { AppModule } from '../../../app.module';
import { EvaluationResultManagerService } from '../course-retrieval/evaluators/evaluation-result-manager.service';
import { CourseRetrievalTestSetLoaderService } from '../course-retrieval/loaders/course-retrieval-test-set-loader.service';
import { I_COURSE_RETRIEVER_EVALUATION_RUNNER_TOKEN } from '../course-retrieval/runners/course-retriever-evaluation-runner.service';
import { CourseRetrieverEvaluationRunnerService } from '../course-retrieval/runners/course-retriever-evaluation-runner.service';
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
  --help, -h            Show this help message

Evaluation Modes:
  1. All skills from all entries:
     bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json

  2. All skills from specific queryLogId:
     bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json --query-log-id "abc123"

  3. Specific skill from specific queryLogId:
     bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json --query-log-id "abc123" --skill "data analysis"

Notes:
  - Evaluations are processed per question with concurrency control (2 skills at a time)
  - Each skill is evaluated independently with its own set of retrieved courses
  - Results are saved to data/evaluation/course-retriever/<test-set-name>/iteration-<n>/

Examples:
  # Load and evaluate all skills from test-set-v1.json
  bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json

  # Evaluate specific skill with custom test set name
  bunx ts-node .../evaluate-from-json.cli.ts test-set-v1.json --query-log-id "abc123" --skill "python" --test-set-name "my-experiment"
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
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    // Load test set from JSON
    const loader = appContext.get(CourseRetrievalTestSetLoaderService);
    const testSetName = args.testSetName ?? args.filename.replace('.json', '');

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

    // Get runner and result manager
    const runner = appContext.get<CourseRetrieverEvaluationRunnerService>(
      I_COURSE_RETRIEVER_EVALUATION_RUNNER_TOKEN,
    );
    const resultManager = appContext.get(EvaluationResultManagerService);

    logger.log('Starting evaluation (concurrent per question)...');

    // Group evaluator inputs by testCaseId
    const groupedByTestCase = new Map<string, EvaluateRetrieverInput[]>();
    for (const input of evaluatorInputs) {
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
            const progress = `[${globalIndex}/${evaluatorInputs.length}]`;
            logger.log(
              `${progress} Evaluating: skill="${input.skill}" testCaseId="${input.testCaseId}"`,
            );
            return runner.runEvaluator(
              {
                iterationNumber: args.iteration,
                prefixDir: testSetName,
              },
              input,
            );
          }),
        ),
      );

      results.push(...groupResults);
      logger.log(`Completed testCaseId "${testCaseId}"`);
    }

    // Aggregate and save metrics if we have results
    if (results.length > 0) {
      logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.log('Aggregating metrics...');

      // Calculate iteration metrics for ALL results at once
      // The calculateIterationMetrics method handles grouping by testCaseId internally
      const metrics = resultManager.calculateIterationMetrics({
        iterationNumber: args.iteration,
        records: results,
      });

      // Save test case metrics
      await resultManager.saveTestCaseMetrics({
        testSetName,
        iterationNumber: args.iteration,
        testCaseMetrics: metrics.testCaseMetrics,
      });

      // Save iteration metrics (call ONCE for all test cases, not per-testCase)
      await resultManager.saveIterationMetrics({
        testSetName,
        iterationNumber: args.iteration,
        metrics,
      });

      logger.log(
        `Aggregated ${results.length} skills across ${metrics.totalCases} test cases`,
      );
      logger.log(
        `  Macro avg skill relevance: ${metrics.macroAvg.averageSkillRelevance}/3`,
      );
      logger.log(
        `  Micro avg skill relevance: ${metrics.microAvg.averageSkillRelevance}/3`,
      );

      // Log per-testCase summary
      for (const testCaseMetric of metrics.testCaseMetrics) {
        logger.log(
          `  TestCase "${testCaseMetric.question}": ${testCaseMetric.totalSkills} skills`,
        );
      }

      logger.log('Aggregation complete!');
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
