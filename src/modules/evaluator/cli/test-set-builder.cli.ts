import { NestFactory } from '@nestjs/core';

import { isUUID } from 'class-validator';

import {
  I_QUERY_LOGGING_REPOSITORY_TOKEN,
  IQueryLoggingRepository,
} from 'src/modules/query-logging/contracts/i-query-logging-repository.contract';

import { AppModule } from '../../../app.module';
import { TestSetBuilderService } from '../shared/services/test-set-builder.service';

/**
 * Test Set Builder CLI
 *
 * Usage:
 *   bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/test-set-builder.cli.ts [OPTIONS]
 *
 * Options:
 *   --step <step>          Step to build test set for (required)
 *   --ids <id1,id2,...>    Comma-separated query-log IDs (required unless --list)
 *   --output <file>        Output JSON file path (default: test-set-<step>.json)
 *   --list                 List available query-log IDs
 *   --list-steps           List available steps
 *   --help, -h             Show this help message
 *
 * Examples:
 *   # List available steps
 *   bunx ts-node .../test-set-builder.cli.ts --list-steps
 *
 *   # List available query-log IDs
 *   bunx ts-node .../test-set-builder.cli.ts --list
 *
 *   # Build skill expansion test set
 *   bunx ts-node .../test-set-builder.cli.ts --step skill-expansion --ids log-id-1
 *
 *   # Build classification test set with multiple IDs
 *   bunx ts-node .../test-set-builder.cli.ts --step classification --ids log-id-1,log-id-2 --output my-test-set.json
 *
 *   # Build query profile test set
 *   bunx ts-node .../test-set-builder.cli.ts --step query-profile --ids log-id-1
 */

/**
 * Available steps for test set building
 */
const AVAILABLE_STEPS = [
  {
    key: 'skill-expansion',
    name: 'SKILL_EXPANSION',
    method: 'buildSkillExpansionTestSet',
  },
  {
    key: 'classification',
    name: 'QUESTION_CLASSIFICATION',
    method: 'buildClassificationTestSet',
  },
  {
    key: 'query-profile',
    name: 'QUERY_PROFILE_BUILDING',
    method: 'buildQueryProfileTestSet',
  },
  {
    key: 'course-retrieval',
    name: 'COURSE_RETRIEVAL',
    method: 'buildCourseRetrievalTestSet',
  },
  {
    key: 'course-filter',
    name: 'COURSE_RELEVANCE_FILTER',
    method: 'buildCourseFilterTestSet',
  },
  {
    key: 'course-aggregation',
    name: 'COURSE_AGGREGATION',
    method: 'buildCourseAggregationTestSet',
  },
  {
    key: 'answer-synthesis',
    name: 'ANSWER_SYNTHESIS',
    method: 'buildAnswerSynthesisTestSet',
  },
] as const;

type StepKey = (typeof AVAILABLE_STEPS)[number]['key'];

/**
 * CLI arguments interface
 */
interface CliArgs {
  step: StepKey | null;
  ids: string[] | null;
  output: string | null;
  list: boolean;
  listSteps: boolean;
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    step: null,
    ids: null,
    output: null,
    list: false,
    listSteps: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      result.help = true;
      return result;
    }

    if (args[i] === '--list') {
      result.list = true;
      return result;
    }

    if (args[i] === '--list-steps') {
      result.listSteps = true;
      return result;
    }

    if (args[i] === '--step' && args[i + 1]) {
      const stepKey = args[i + 1];
      const step = AVAILABLE_STEPS.find((s) => s.key === stepKey);
      if (!step) {
        console.error(`Error: Invalid step "${stepKey}"`);
        console.error(
          `Available steps: ${AVAILABLE_STEPS.map((s) => s.key).join(', ')}`,
        );
        process.exit(1);
      }
      result.step = stepKey as StepKey;
      i++;
    }

    if (args[i] === '--ids' && args[i + 1]) {
      result.ids = args[i + 1]
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      i++;
    }

    if (args[i] === '--output' && args[i + 1]) {
      result.output = args[i + 1];
      i++;
    }
  }

  return result;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Test Set Builder CLI

Usage:
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/test-set-builder.cli.ts [OPTIONS]

Options:
  --step <step>          Step to build test set for (required)
  --ids <id1,id2,...>    Comma-separated query-log IDs (required unless --list)
  --output <file>        Output JSON file path (default: test-set-<step>.json)
  --list                 List available query-log IDs from database
  --list-steps           List available steps
  --help, -h             Show this help message

Examples:
  # List available steps
  bunx ts-node .../test-set-builder.cli.ts --list-steps

  # List available query-log IDs
  bunx ts-node .../test-set-builder.cli.ts --list

  # Build skill expansion test set
  bunx ts-node .../test-set-builder.cli.ts --step skill-expansion --ids log-id-1

  # Build classification test set with multiple IDs
  bunx ts-node .../test-set-builder.cli.ts --step classification --ids log-id-1,log-id-2 --output my-test-set.json

  # Build query profile test set
  bunx ts-node .../test-set-builder.cli.ts --step query-profile --ids log-id-1
`);
}

/**
 * List available steps
 */
function listSteps(): void {
  console.log('\nAvailable Steps:');
  console.log('─────────────────────────────────────────────────────────────');

  for (const step of AVAILABLE_STEPS) {
    console.log(`  ${step.key}`);
    console.log(`    Name: ${step.name}`);
    console.log(`    Method: ${step.method}`);
    console.log('');
  }

  console.log('─────────────────────────────────────────────────────────────');
  console.log('\nUsage: --step <key> --ids <id1,id2,...>');
  console.log('');
}

/**
 * List available query-log IDs from database
 */
async function listQueryLogIds(): Promise<void> {
  console.log('\nFetching query-log IDs from database...');
  console.log('─────────────────────────────────────────────────────────────');

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const queryLogRepo: IQueryLoggingRepository = appContext.get(
      I_QUERY_LOGGING_REPOSITORY_TOKEN,
    );
    const logs = await queryLogRepo.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\nFound ${logs.length} recent query logs:`);
    console.log('');

    for (const log of logs) {
      console.log(`  ${log.id}`);
      console.log(
        `    Question: "${log.question.substring(0, 60)}${log.question.length > 60 ? '...' : ''}"`,
      );
      console.log(`    Status: ${log.status}`);
      console.log(`    Created: ${log.createdAt.toISOString()}`);
      console.log('');
    }

    console.log(
      '─────────────────────────────────────────────────────────────',
    );
    console.log('\nUsage: --step <step> --ids <id1,id2,...>');
    console.log('');
  } finally {
    await appContext.close();
  }
}

/**
 * Build test set
 */
async function buildTestSet(args: CliArgs): Promise<void> {
  const { step, ids, output } = args;

  if (!step || !ids || ids.length === 0) {
    console.error('Error: --step and --ids are required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Validate UUID formats using class-validator
  const invalidIds = ids.filter((id) => !isUUID(id, '4'));
  if (invalidIds.length > 0) {
    console.error('Error: Invalid UUID format:');
    invalidIds.forEach((id) => console.error(`  - ${id}`));
    console.error(
      '\nUUIDs must be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    );
    process.exit(1);
  }

  const stepConfig = AVAILABLE_STEPS.find((s) => s.key === step);
  if (!stepConfig) {
    console.error(`Error: Invalid step "${step}"`);
    process.exit(1);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Test Set Builder`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Step: ${stepConfig.name}`);
  console.log(`Query Log IDs: ${ids.length}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const testSetBuilder = appContext.get(TestSetBuilderService);

    // Generate filename if not provided
    const filename =
      output?.split('/').pop()?.replace('.json', '') ??
      `test-set-${step}-${Date.now()}`;

    // Extract directory from output or use default
    const directory =
      output && output.includes('/')
        ? output.substring(0, output.lastIndexOf('/'))
        : undefined;

    // Build and save test set based on step
    let savedPath: string;
    switch (step) {
      case 'skill-expansion':
        savedPath = await testSetBuilder.buildAndSaveSkillExpansionTestSet(
          ids,
          filename,
          directory,
        );
        break;
      case 'classification':
        savedPath = await testSetBuilder.buildAndSaveClassificationTestSet(
          ids,
          filename,
          directory,
        );
        break;
      case 'query-profile':
        savedPath = await testSetBuilder.buildAndSaveQueryProfileTestSet(
          ids,
          filename,
          directory,
        );
        break;
      case 'course-retrieval':
        savedPath = await testSetBuilder.buildAndSaveCourseRetrievalTestSet(
          ids,
          filename,
          directory,
        );
        break;
      case 'course-filter':
        savedPath = await testSetBuilder.buildAndSaveCourseFilterTestSet(
          ids,
          filename,
          directory,
        );
        break;
      case 'course-aggregation':
        savedPath = await testSetBuilder.buildAndSaveCourseAggregationTestSet(
          ids,
          filename,
          directory,
        );
        break;
      case 'answer-synthesis':
        savedPath = await testSetBuilder.buildAndSaveAnswerSynthesisTestSet(
          ids,
          filename,
          directory,
        );
        break;
      default:
        console.error(`Error: Step "${String(step)}" not implemented`);
        process.exit(1);
    }

    console.log(`✓ Exported to: ${savedPath}\n`);

    // Read and display sample from saved file
    const { FileHelper } = await import('src/shared/utils/file');
    const testSet = await FileHelper.loadJson<unknown[]>(savedPath);

    if (testSet.length > 0) {
      console.log('Sample entry:');
      console.log(JSON.stringify(testSet[0], null, 2));
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Done! ${testSet.length} test cases exported to ${savedPath}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } finally {
    await appContext.close();
  }
}

/**
 * Main bootstrap function
 */
async function bootstrap(): Promise<void> {
  const args = parseArgs();

  // Handle special flags
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.listSteps) {
    listSteps();
    process.exit(0);
  }

  if (args.list) {
    await listQueryLogIds();
    process.exit(0);
  }

  // Build test set
  await buildTestSet(args);
}

bootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
