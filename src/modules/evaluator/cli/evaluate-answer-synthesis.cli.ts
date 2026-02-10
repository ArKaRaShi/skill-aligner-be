import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { FileHelper } from 'src/shared/utils/file';

import { AppModule } from '../../../app.module';
import { AnswerSynthesisTestSetLoaderService } from '../answer-synthesis/loaders/answer-synthesis-test-set-loader.service';
import { AnswerSynthesisTestSetTransformer } from '../answer-synthesis/loaders/answer-synthesis-test-set-transformer.service';
import { AnswerSynthesisRunnerService } from '../answer-synthesis/services/answer-synthesis-runner.service';
import type {
  AnswerSynthesisEvaluationConfig,
  AnswerSynthesisTestCase,
} from '../answer-synthesis/types/answer-synthesis.types';
import { EvaluatorJudgeConfig } from '../shared/configs';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TEST_SET_DIR = 'data/evaluation/test-sets';

// ============================================================================
// TYPES
// ============================================================================

interface CliArgs {
  // Mode 1: Single merged file (new, simpler)
  testSet?: string;

  // Mode 2: Two separate files (current, flexible)
  answerFile?: string;
  contextFile?: string;

  // Common options
  testSetName?: string;
  outputDir?: string;
  iterations?: number;
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
    iterations: 1,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      return result;
    }

    // Mode 1: Single merged file
    if (arg === '--test-set' && args[i + 1]) {
      result.testSet = args[i + 1];
      i += 2;
      continue;
    }

    // Mode 2: Two separate files
    if (arg === '--answer-file' && args[i + 1]) {
      result.answerFile = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--context-file' && args[i + 1]) {
      result.contextFile = args[i + 1];
      i += 2;
      continue;
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

    if (arg === '--system-prompt-version' && args[i + 1]) {
      result.systemPromptVersion = args[i + 1];
      i += 2;
      continue;
    }

    console.error(`Error: Unknown argument "${arg}"`);
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Validate required arguments - either mode 1 OR mode 2
  const hasMode1 = Boolean(result.testSet);
  const hasMode2 = Boolean(result.answerFile || result.contextFile);

  if (!hasMode1 && !hasMode2) {
    console.error(
      'Error: Either --test-set OR (--answer-file + --context-file) required',
    );
    console.error('Use --help for usage information');
    process.exit(1);
  }

  if (hasMode1 && hasMode2) {
    console.error(
      'Error: Cannot use both --test-set and (--answer-file + --context-file) together',
    );
    console.error('Use --help for usage information');
    process.exit(1);
  }

  if (hasMode2 && (!result.answerFile || !result.contextFile)) {
    console.error(
      'Error: Both --answer-file and --context-file required when using two-file mode',
    );
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
Answer Synthesis Evaluator CLI

Usage:
  # Mode 1: Single merged test set file (recommended)
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/evaluate-answer-synthesis.cli.ts --test-set <filename> [OPTIONS]

  # Mode 2: Two separate files (answer + context)
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/evaluate-answer-synthesis.cli.ts --answer-file <filename> --context-file <filename> [OPTIONS]

Required Arguments (Mode 1):
  --test-set <file>       Path to merged test set JSON from --step answer-synthesis-eval

Required Arguments (Mode 2):
  --answer-file <file>    Path to answer synthesis test set JSON
  --context-file <file>   Path to course aggregation context set JSON

Options:
  --test-set-name <n>        Custom test set name for result grouping
  --output-dir <dir>         Custom output directory (default: data/evaluation/answer-synthesis/<test-set-name>)
  --iterations <n>           Number of iterations to run (default: 1)
  --judge-model <model>      Judge model to use (default: from config)
  --judge-provider <p>       Judge provider to use (default: from config)
  --system-prompt-version <v> System prompt version (optional)
  --help, -h                 Show this help message

Description:
  Evaluates answer synthesis quality using LLM-as-a-Judge methodology.
  Each generated answer is evaluated on TWO dimensions:
  - FAITHFULNESS: Does the answer stick to the provided context? (no hallucinations)
  - COMPLETENESS: Does the answer explain WHY courses matter to the user?

  Pass = (faithfulness >= 4) AND (completeness >= 4)

Two-Dimensional Scoring:
  - Faithfulness (1-5): Does the answer stick to provided context? (hallucination check)
  - Completeness (1-5): Does the answer explain WHY courses matter? (quality check)
  - Pass: BOTH scores >= 4

Notes:
  - Mode 1 (single file): Use with --step answer-synthesis-eval from test-set-builder
  - Mode 2 (two files): Requires answer synthesis + course aggregation test sets
  - Progress tracking allows crash recovery - just re-run the same command
  - Results saved to: data/evaluation/answer-synthesis/<test-set-name>/

Workflow:
  # Step 1: Build merged test set (recommended)
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/test-set-builder.cli.ts \\
    --step answer-synthesis-eval \\
    --ids query-log-id-1,query-log-id-2 \\
    --output test-set-answer-synthesis-eval.json

  # Step 2: Run evaluation
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/evaluate-answer-synthesis.cli.ts --test-set test-set-answer-synthesis-eval.json

Examples (Mode 1 - Single File):
  # Evaluate with merged test set
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/evaluate-answer-synthesis.cli.ts --test-set test-set-answer-synthesis-eval.json

  # Evaluate with custom options
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/evaluate-answer-synthesis.cli.ts \\
    --test-set test-set-v1.json \\
    --test-set-name "my-experiment" \\
    --iterations 3 \\
    --judge-model "gpt-4o"

Examples (Mode 2 - Two Files):
  # Build separate test sets first
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/test-set-builder.cli.ts --step answer-synthesis --ids log-id-1 --output answers.json
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/test-set-builder.cli.ts --step course-aggregation --ids log-id-1 --output context.json

  # Then evaluate
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/evaluate-answer-synthesis.cli.ts \\
    --answer-file answers.json \\
    --context-file context.json \\
    --test-set-name "my-experiment" \\
    --iterations 3
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

  const logger = new Logger('EvaluateAnswerSynthesisCLI');

  const mode = args.testSet ? 'Single File (Merged)' : 'Two Files (Separate)';

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('Answer Synthesis Evaluator');
  logger.log(`Mode: ${mode}`);
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (args.testSet) {
    logger.log(`Test Set: ${args.testSet}`);
  } else {
    logger.log(`Answer File: ${args.answerFile}`);
    logger.log(`Context File: ${args.contextFile}`);
  }
  logger.log(`Iterations: ${args.iterations}`);
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
    const loader = appContext.get(AnswerSynthesisTestSetLoaderService);
    const transformer = appContext.get(AnswerSynthesisTestSetTransformer);
    const runner = appContext.get(AnswerSynthesisRunnerService);

    // Determine test set name and output directory
    const sourceName = args.testSet ?? args.answerFile ?? '';
    const testSetName = args.testSetName ?? sourceName.replace('.json', '');
    const outputDir = args.outputDir ?? testSetName;

    logger.log(`Loading test set "${testSetName}"...`);

    let testCases: AnswerSynthesisTestCase[];

    if (args.testSet) {
      // Mode 1: Load merged test set directly
      const filepath = args.testSet.endsWith('.json')
        ? `${DEFAULT_TEST_SET_DIR}/${args.testSet}`
        : `${DEFAULT_TEST_SET_DIR}/${args.testSet}.json`;

      logger.log(`Loading merged test set from: ${filepath}`);
      testCases =
        await FileHelper.loadJson<AnswerSynthesisTestCase[]>(filepath);

      if (testCases.length === 0) {
        logger.warn('No test cases found in test set file.');
        await appContext.close();
        process.exit(0);
      }
      logger.log(`Loaded ${testCases.length} test cases`);
    } else {
      // Mode 2: Load and transform two files
      logger.log('Loading answer synthesis test set...');
      const answerSet = await loader.loadAnswerSynthesisSet(args.answerFile!);
      if (answerSet.length === 0) {
        logger.warn('No entries found in answer synthesis test set file.');
        await appContext.close();
        process.exit(0);
      }
      logger.log(`Loaded ${answerSet.length} answer synthesis entries`);

      logger.log('Loading course aggregation context set...');
      const contextSet = await loader.loadContextSet(args.contextFile!);
      if (contextSet.length === 0) {
        logger.warn('No entries found in context set file.');
        await appContext.close();
        process.exit(0);
      }
      logger.log(`Loaded ${contextSet.length} context entries`);

      // Transform to test cases (merge answer + context)
      logger.log('Transforming test cases...');
      testCases = transformer.transformToTestCases(answerSet, contextSet);

      if (testCases.length === 0) {
        logger.warn('No test cases created after transformation.');
        await appContext.close();
        process.exit(0);
      }

      logger.log(`Created ${testCases.length} test cases`);
    }

    // Calculate total courses for display
    const totalCourses = testCases.reduce(
      (sum, tc) => sum + tc.context.length,
      0,
    );
    logger.log(`Total courses in context: ${totalCourses}`);

    // Build evaluation config
    const config: AnswerSynthesisEvaluationConfig = {
      judgeModel:
        args.judgeModel ?? EvaluatorJudgeConfig.ANSWER_SYNTHESIS.JUDGE_MODEL,
      judgeProvider:
        args.judgeProvider ??
        EvaluatorJudgeConfig.ANSWER_SYNTHESIS.JUDGE_PROVIDER,
      iterations: args.iterations ?? 1,
      outputDirectory: outputDir,
      systemPromptVersion: args.systemPromptVersion,
    };

    logger.log('Starting evaluation...');
    logger.log(`  Judge: ${config.judgeProvider}/${config.judgeModel}`);
    if (config.systemPromptVersion) {
      logger.log(`  System Prompt: ${config.systemPromptVersion}`);
    }
    logger.log(`  Iterations: ${config.iterations}`);
    logger.log(`  Output Dir: data/evaluation/answer-synthesis/${outputDir}`);

    // Run evaluation
    await runner.runEvaluation({
      testCases,
      config,
    });

    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('Evaluation complete!');
    logger.log(
      `Results saved to: data/evaluation/answer-synthesis/${outputDir}/`,
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
