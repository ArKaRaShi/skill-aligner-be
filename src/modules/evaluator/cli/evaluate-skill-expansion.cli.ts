import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { FileHelper } from 'src/shared/utils/file';

import { AppModule } from '../../../app.module';
import { EvaluatorJudgeConfig } from '../shared/configs';
import { SkillExpansionEvaluationRunnerService } from '../skill-expansion/services/skill-expansion-runner.service';
import type {
  SkillExpansionEvaluationConfig,
  SkillExpansionTestSet,
} from '../skill-expansion/types/skill-expansion.types';

// ============================================================================
// TYPES
// ============================================================================

interface CliArgs {
  filename: string;
  testSetName?: string;
  outputDir?: string;
  iterations?: number;
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
Skill Expansion Evaluator CLI

Usage:
  bun run cli evaluator:skill-expansion <filename> [OPTIONS]

Arguments:
  filename              Path to JSON test set file (relative to data/evaluation/test-sets/)

Options:
  --test-set-name <n>   Custom test set name for result grouping (default: filename without .json)
  --output-dir <dir>     Custom output directory (default: data/evaluation/skill-expansion/<test-set-name>)
  --iterations <n>       Number of iterations to run (default: 1)
  --judge-model <model>  Judge model to use (default: from config)
  --judge-provider <p>   Judge provider to use (default: from config)
  --help, -h            Show this help message

Description:
  Evaluates skill expansion quality using LLM-as-a-Judge methodology.
  Each extracted skill is evaluated for:
  - Relevance to the user's question
  - Teachability in university context
  - Quality (conceptual, not procedural)
  - Concept preservation (at least one skill preserves user's explicitly mentioned concept)

  The evaluation tracks progress at the skill level, allowing resumption
  after interruption. Progress is stored in:
  data/evaluation/skill-expansion/<test-set-name>/iteration-<n>/.progress.json

  Results are saved to:
  data/evaluation/skill-expansion/<test-set-name>/

Notes:
  - One question + all skills = One LLM call (no batching)
  - Progress tracking allows crash recovery - just re-run the same command
  - Each iteration produces separate metrics and comparison records

Examples:
  # Load and evaluate test-set-skill-expansion.json
  bun run cli evaluator:skill-expansion test-set-skill-expansion.json

  # Evaluate with custom test set name
  bun run cli evaluator:skill-expansion test-set-v1.json --test-set-name "my-experiment"

  # Run 3 iterations with custom judge model
  bun run cli evaluator:skill-expansion test-set-v1.json --iterations 3 --judge-model "gpt-4o"

  # Specify custom output directory
  bun run cli evaluator:skill-expansion test-set-v1.json --output-dir "custom-output-dir"
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

  const logger = new Logger('EvaluateSkillExpansionCLI');

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('Skill Expansion Evaluator');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log(`Filename: ${args.filename}`);
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
    const runner = appContext.get(SkillExpansionEvaluationRunnerService);

    // Determine test set name and output directory
    const testSetName = args.testSetName ?? args.filename.replace('.json', '');
    const outputDir = args.outputDir ?? testSetName;

    logger.log(`Loading test set "${testSetName}"...`);

    // Load test set from JSON
    const DEFAULT_TEST_SET_DIR = 'data/evaluation/test-sets';
    const filepath = args.filename.endsWith('.json')
      ? `${DEFAULT_TEST_SET_DIR}/${args.filename}`
      : `${DEFAULT_TEST_SET_DIR}/${args.filename}.json`;

    const testSet = await FileHelper.loadJson<SkillExpansionTestSet>(filepath);

    if (!testSet.cases || testSet.cases.length === 0) {
      logger.warn('No entries found in test set file.');
      await appContext.close();
      process.exit(0);
    }

    logger.log(
      `Loaded test set "${testSet.name}" with ${testSet.cases.length} entries`,
    );

    // Calculate total skills
    const totalSkills = testSet.cases.reduce(
      (sum, entry) => sum + entry.rawOutput.skillItems.length,
      0,
    );
    logger.log(`Total skills to evaluate: ${totalSkills}`);

    // Build evaluation config
    const config: SkillExpansionEvaluationConfig = {
      judgeModel:
        args.judgeModel ?? EvaluatorJudgeConfig.SKILL_EXPANSION.JUDGE_MODEL,
      judgeProvider:
        args.judgeProvider ??
        EvaluatorJudgeConfig.SKILL_EXPANSION.JUDGE_PROVIDER,
      iterations: args.iterations ?? 1,
      outputDirectory: outputDir,
    };

    logger.log('Starting evaluation...');
    logger.log(`  Judge: ${config.judgeProvider}/${config.judgeModel}`);
    logger.log(`  Iterations: ${config.iterations}`);
    logger.log(`  Output Dir: data/evaluation/skill-expansion/${outputDir}`);

    // Run evaluation
    await runner.runEvaluation({
      testSet,
      config,
    });

    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('Evaluation complete!');
    logger.log(
      `Results saved to: data/evaluation/skill-expansion/${outputDir}/`,
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
