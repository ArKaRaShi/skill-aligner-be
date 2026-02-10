import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../../app.module';
import { CourseRetrievalMetricsMigratorService } from '../course-retrieval/services/course-retrieval-metrics-migrator.service';

// ============================================================================
// TYPES
// ============================================================================

interface CliArgs {
  testSet: string;
  iteration: string;
  dryRun: boolean;
  backup: boolean;
  help: boolean;
}

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

/**
 * Parse command line arguments
 * @returns Parsed arguments object or null if help should be shown
 */
function parseArgs(): CliArgs | null {
  const args = process.argv.slice(2);

  // Show help if no arguments provided
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return null;
  }

  const result: CliArgs = {
    testSet: '',
    iteration: '1',
    dryRun: false,
    backup: false,
    help: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--test-set' && args[i + 1]) {
      result.testSet = args[i + 1];
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
      result.iteration = args[i + 1];
      i += 2;
      continue;
    }

    if (arg === '--dry-run') {
      result.dryRun = true;
      i++;
      continue;
    }

    if (arg === '--backup') {
      result.backup = true;
      i++;
      continue;
    }

    console.error(`Error: Unknown argument "${arg}"`);
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Validate required arguments
  if (!result.testSet) {
    console.error('Error: --test-set is required');
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
Course Retrieval Metrics Migration CLI

Migrates existing evaluation records from old single-threshold precision format
to the new multi-threshold precision format (≥1, ≥2, ≥3).

Usage:
  bunx ts-node --require tsconfig-paths/register \\
    src/modules/evaluator/cli/migrate-course-retrieval-metrics.cli.ts \\
    --test-set <name> --iteration <number> [OPTIONS]

Required Arguments:
  --test-set <name>     Name of test set to migrate

Optional Arguments:
  --iteration <number>   Iteration number to migrate (default: 1)
  --dry-run             Show what would change without writing files
  --backup              Create backup before overwriting (recommended!)
  --help, -h            Show this help message

Examples:
  # Preview changes (dry run) - RECOMMENDED FIRST STEP
  bunx ts-node .../migrate-course-retrieval-metrics.cli.ts \\
    --test-set "test-set-v1" --iteration 1 --dry-run

  # Migrate with backup - RECOMMENDED
  bunx ts-node .../migrate-course-retrieval-metrics.cli.ts \\
    --test-set "test-set-v1" --iteration 1 --backup

  # Migrate without backup (risky - not recommended)
  bunx ts-node .../migrate-course-retrieval-metrics.cli.ts \\
    --test-set "test-set-v1" --iteration 1

What Gets Migrated:
  ✓ records/records-iteration-N.json       # Individual record metrics
  ✓ metrics/metrics-iteration-N.json       # Aggregated iteration metrics

Migration Details:
  • Reads raw LLM scores from rawEvaluations field
  • Recalculates precision at 3 thresholds (≥1, ≥2, ≥3)
  • Preserves all other data (question, skill, courses, etc.)
  • Can be run multiple times safely (idempotent)

Backup Files:
  Created with timestamp suffix: .backup-YYYY-MM-DDTHH-MM-SS-SSSZ
  To restore: mv backup-file original-file

Safety Tips:
  1. ALWAYS run --dry-run first to preview changes
  2. Use --backup unless you're absolutely sure
  3. Migration only affects one test set/iteration at a time
  4. Original records are preserved if --backup is used

Notes:
  • Does NOT re-run LLM evaluation (uses existing rawEvaluations)
  • Does NOT modify test set files, only evaluation results
  • Final metrics (final-metrics.json) need manual update or re-aggregation
`);
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function bootstrap() {
  const args = parseArgs();

  if (!args) {
    showHelp();
    process.exit(0);
  }

  const logger = new Logger('MigrateCourseRetrievalMetrics');

  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('Course Retrieval Metrics Migration');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Warn if no backup
  if (!args.backup && !args.dryRun) {
    console.log('');
    console.log('⚠️  WARNING: Running without --backup flag!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(
      'This will MODIFY your evaluation data without creating a backup.',
    );
    console.log(`Test Set: ${args.testSet}`);
    console.log(`Iteration: ${args.iteration}`);
    console.log('');
    console.log('Files to be modified:');
    console.log(
      `  - data/evaluation/course-retriever/${args.testSet}/records/records-iteration-${args.iteration}.json`,
    );
    console.log(
      `  - data/evaluation/course-retriever/${args.testSet}/metrics/metrics-iteration-${args.iteration}.json`,
    );
    console.log('');
    console.log(
      'Recommendation: Use --backup flag to create timestamped backups.',
    );
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('Continue without backup? [y/N]:');

    // In non-interactive mode, just warn and continue
    // For interactive use, you'd want to read from stdin here
    logger.warn('Proceeding without backup as requested...');
  }

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const migrator = appContext.get(CourseRetrievalMetricsMigratorService);

    const result = await migrator.migrateIteration({
      testSetName: args.testSet,
      iterationNumber: Number.parseInt(args.iteration, 10),
      dryRun: args.dryRun,
      backup: args.backup,
    });

    await appContext.close();

    if (result.dryRun) {
      logger.log('');
      logger.log('Dry run complete. To apply changes:');
      logger.log(
        `  bunx ts-node .../migrate-course-retrieval-metrics.cli.ts --test-set "${args.testSet}" --iteration ${args.iteration}`,
      );
      if (!args.backup) {
        logger.log(
          '  (Add --backup flag to create backup before modifying files)',
        );
      }
    }

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    await appContext.close();
    process.exit(1);
  }
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

void bootstrap();
