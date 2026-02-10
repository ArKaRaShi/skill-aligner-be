import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { FileHelper } from 'src/shared/utils/file';

import { AppModule } from '../../../app.module';
import { CourseFilterEvaluationRunnerService } from '../course-relevance-filter/services/course-filter-evaluation-runner.service';
import type { EvaluationConfig } from '../course-relevance-filter/types/course-relevance-filter.types';
import { EvaluatorJudgeConfig } from '../shared/configs';
import type { CourseFilterTestSetSerialized } from '../shared/services/test-set.types';

// ============================================================================
// TYPES
// ============================================================================

interface CliArgs {
  filename: string;
  testSetName?: string;
  outputDir?: string;
  iteration: number;
  judgeModel?: string;
  judgeProvider?: string;
  systemPromptVersion?: string;
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

    if (arg === '--output-dir' && args[i + 1]) {
      result.outputDir = args[i + 1];
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

    if (arg === '--system-prompt-version' && args[i + 1]) {
      result.systemPromptVersion = args[i + 1];
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
Course Filter Evaluator (JSON Test Set) CLI

Usage:
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/evaluate-course-filter.cli.ts <filename> [OPTIONS]

Arguments:
  filename              Path to JSON test set file (relative to data/evaluation/test-sets/)

Options:
  --test-set-name <n>   Custom test set name for result grouping (default: filename without .json)
  --output-dir <dir>     Custom output directory (default: data/evaluation/course-relevance-filter/<test-set-name>)
  --iteration <number>   Iteration number for results (default: 1)
  --judge-model <model>  Judge model to use (default: from config)
  --judge-provider <p>   Judge provider to use (default: from config)
  --system-prompt-version <v> System prompt version (default: from config)
  --help, -h            Show this help message

Description:
  Evaluates course relevance filter performance using LLM-as-a-Judge methodology.
  Each course in the test set is evaluated by a judge LLM to determine if it
  should be kept or dropped. Results are compared against the system's scores.

  The evaluation tracks progress at the course level, allowing resumption
  after interruption. Progress is stored in:
  data/evaluation/course-relevance-filter/<test-set-name>/progress-iteration-<n>.json

  Results are saved to:
  data/evaluation/course-relevance-filter/<test-set-name>/iteration-<n>/

Notes:
  - Evaluations are processed per question with all courses in parallel
  - Progress tracking allows crash recovery - just re-run the same command
  - Each iteration produces separate metrics and comparison records

Examples:
  # Load and evaluate test-set-v1.json
  bunx ts-node .../evaluate-course-filter.cli.ts test-set-v1.json

  # Evaluate with custom test set name
  bunx ts-node .../evaluate-course-filter.cli.ts test-set-v1.json --test-set-name "my-experiment"

  # Run iteration 2 with custom judge model
  bunx ts-node .../evaluate-course-filter.cli.ts test-set-v1.json --iteration 2 --judge-model "gpt-4o"

  # Specify custom output directory
  bunx ts-node .../evaluate-course-filter.cli.ts test-set-v1.json --output-dir "custom-output-dir"
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

  const logger = new Logger('EvaluateCourseFilterCLI');

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('Course Filter Evaluator (JSON Test Set)');
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
    // Get services
    const runner = appContext.get(CourseFilterEvaluationRunnerService);

    // Determine test set name and output directory
    const testSetName = args.testSetName ?? args.filename.replace('.json', '');
    const outputDir = args.outputDir ?? testSetName;

    logger.log(`Loading test set "${testSetName}"...`);

    // Load raw test set from JSON (runner will transform it)
    const DEFAULT_TEST_SET_DIR = 'data/evaluation/test-sets';
    const filepath = args.filename.endsWith('.json')
      ? `${DEFAULT_TEST_SET_DIR}/${args.filename}`
      : `${DEFAULT_TEST_SET_DIR}/${args.filename}.json`;

    const testSet =
      await FileHelper.loadJson<CourseFilterTestSetSerialized[]>(filepath);

    if (testSet.length === 0) {
      logger.warn('No entries found in test set file.');
      await appContext.close();
      process.exit(0);
    }

    logger.log(`Loaded ${testSet.length} test set entries`);

    // Calculate approximate total courses (for display)
    const totalCourses = testSet.reduce((sum, entry) => {
      const acceptedCount =
        (entry.rawOutput?.llmAcceptedCoursesBySkill &&
          Object.values(entry.rawOutput.llmAcceptedCoursesBySkill).reduce(
            (skillSum, courses) => skillSum + courses.length,
            0,
          )) ||
        0;
      const rejectedCount =
        (entry.rawOutput?.llmRejectedCoursesBySkill &&
          Object.values(entry.rawOutput.llmRejectedCoursesBySkill).reduce(
            (skillSum, courses) => skillSum + courses.length,
            0,
          )) ||
        0;
      return sum + acceptedCount + rejectedCount;
    }, 0);
    logger.log(`Approximate courses to evaluate: ${totalCourses}`);

    // Build evaluation config
    const config: EvaluationConfig = {
      systemPromptVersion: args.systemPromptVersion ?? '1.0',
      judgeModel:
        args.judgeModel ??
        EvaluatorJudgeConfig.COURSE_RELEVANCE_FILTER.JUDGE_MODEL,
      judgeProvider:
        args.judgeProvider ??
        EvaluatorJudgeConfig.COURSE_RELEVANCE_FILTER.JUDGE_PROVIDER,
      iterations: args.iteration,
      outputDirectory: outputDir,
    };

    logger.log('Starting evaluation...');
    logger.log(`  Judge: ${config.judgeProvider}/${config.judgeModel}`);
    logger.log(`  System Prompt: ${config.systemPromptVersion}`);
    logger.log(
      `  Output Dir: data/evaluation/course-relevance-filter/${outputDir}`,
    );

    // Run evaluation
    await runner.runEvaluation({
      testSet,
      config,
    });

    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('Evaluation complete!');
    logger.log(
      `Results saved to: data/evaluation/course-relevance-filter/${outputDir}/`,
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
