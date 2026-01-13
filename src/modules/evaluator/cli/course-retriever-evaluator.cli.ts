/**
 * CLI Entry Point for Listing Query Log IDs
 *
 * This utility helps discover query-log IDs for building test sets.
 * For running evaluations, use evaluate-from-json.cli.ts instead.
 *
 * Usage:
 *   bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/course-retriever-evaluator.cli.ts [OPTIONS]
 *
 * Options:
 *   --list-ids            List query-log IDs from database
 *   --help, -h            Show this help message
 *
 * Examples:
 *   # List query-log IDs (for building test sets)
 *   bunx ts-node .../course-retriever-evaluator.cli.ts --list-ids
 */
import { NestFactory } from '@nestjs/core';

import { AppModule } from 'src/app.module';

import {
  I_QUERY_LOGGING_REPOSITORY_TOKEN,
  IQueryLoggingRepository,
} from 'src/modules/query-logging/contracts/i-query-logging-repository.contract';

/**
 * CLI arguments interface
 */
interface CliArgs {
  listIds: boolean;
  help: boolean;
}

/**
 * Parse command line arguments
 * @returns Parsed arguments object
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    listIds: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      result.help = true;
      return result;
    }

    if (args[i] === '--list-ids') {
      result.listIds = true;
      return result;
    }
  }

  return result;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Course Retriever Evaluator CLI

NOTE: For running evaluations, use evaluate-from-json.cli.ts instead.

This utility only lists query-log IDs for building test sets.

Usage:
  bunx ts-node --require tsconfig-paths/register src/modules/evaluator/cli/course-retriever-evaluator.cli.ts [OPTIONS]

Options:
  --list-ids           List query-log IDs from database
  --help, -h           Show this help message

Examples:
  # List query-log IDs (for building test sets with test-set-builder.cli.ts)
  bunx ts-node .../course-retriever-evaluator.cli.ts --list-ids
`);
}

/**
 * List available query-log IDs from database
 *
 * Useful for discovering which query logs to include in test sets.
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
      take: 100, // Limit to most recent
      orderBy: { createdAt: 'desc' },
    });

    console.log(`\nFound ${logs.length} recent query logs:`);
    console.log('');

    for (const log of logs) {
      const hasSteps =
        (log as { processSteps?: unknown[] }).processSteps?.length ?? 0;
      console.log(`  ${log.id}`);
      console.log(
        `    Question: "${log.question.substring(0, 60)}${log.question.length > 60 ? '...' : ''}"`,
      );
      console.log(`    Status: ${log.status}`);
      console.log(`    Steps: ${hasSteps}`);
      console.log(`    Created: ${String(log.createdAt)}`);
      console.log('');
    }

    console.log(
      '─────────────────────────────────────────────────────────────',
    );
    console.log('\nUsage in test sets:');
    console.log('  export const TEST_SET_IDS_V4 = [');
    console.log(`    '${logs[0]?.id}',`);
    console.log(`    '${logs[1]?.id}',`);
    console.log('    // ... more IDs');
    console.log('  ] as const;');
    console.log('');
  } finally {
    await appContext.close();
  }
}

async function bootstrap() {
  const args = parseArgs();

  // Handle special flags
  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.listIds) {
    await listQueryLogIds();
    process.exit(0);
  }

  // No valid arguments provided
  console.error('Error: No valid arguments provided.');
  showHelp();
  process.exit(1);
}

void bootstrap();
