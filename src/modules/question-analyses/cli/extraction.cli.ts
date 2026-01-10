/**
 * Question Extraction CLI
 *
 * Usage:
 *   bunx ts-node --require tsconfig-paths/register src/modules/question-analyses/cli/extraction.cli.ts [OPTIONS]
 *
 * Options:
 *   --ids <id1,id2,...>   Comma-separated question-log IDs (required unless --batch or --list)
 *   --batch                Auto-discover questions without analysis
 *   --limit <n>            Max questions to process (for --batch, default: 100)
 *   --days <n>             Only questions from last N days (for --batch)
 *   --version <v>          Extraction version (default: v1)
 *   --model <name>         LLM model to use (default: gpt-4o-mini)
 *   --dry-run              Preview what would be extracted without actually running
 *   --continue             Don't stop on single errors
 *   --list                 List available question-log IDs from database
 *   --help, -h             Show this help message
 *
 * Examples:
 *   # List available question logs
 *   bunx ts-node .../extraction.cli.ts --list
 *
 *   # Extract from single question
 *   bunx ts-node .../extraction.cli.ts --ids 11111111-1111-1111-1111-111111111111
 *
 *   # Extract from multiple questions
 *   bunx ts-node .../extraction.cli.ts --ids id1,id2,id3
 *
 *   # Batch extract 100 questions without analysis
 *   bunx ts-node .../extraction.cli.ts --batch --limit 100
 *
 *   # Batch extract from last 7 days with dry-run
 *   bunx ts-node .../extraction.cli.ts --batch --days 7 --dry-run
 *
 *   # Extract with specific model
 *   bunx ts-node .../extraction.cli.ts --ids id1 --model gpt-4o --version v2
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { isUUID } from 'class-validator';

import { AppModule } from '../../../app.module';
import type { Identifier } from '../../../shared/contracts/types/identifier';
import { I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN } from '../contracts/repositories/i-question-log-analysis-repository.contract';
import type { IQuestionLogAnalysisRepository } from '../contracts/repositories/i-question-log-analysis-repository.contract';
import { I_QUESTION_LOG_REPOSITORY_TOKEN } from '../contracts/repositories/i-question-log-repository.contract';
import type { IQuestionLogRepository } from '../contracts/repositories/i-question-log-repository.contract';
import { I_QUESTION_EXTRACTION_SERVICE_TOKEN } from '../contracts/services/i-question-extraction-service.contract';
import type { IQuestionExtractionService } from '../contracts/services/i-question-extraction-service.contract';

// ============================================================================
// TYPES
// ============================================================================

interface CliArgs {
  ids: string[] | null;
  batch: boolean;
  limit: number;
  days: number | null;
  version: string;
  model: string;
  dryRun: boolean;
  continueOnError: boolean;
  list: boolean;
  help: boolean;
}

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

/**
 * Parse command line arguments
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    ids: null,
    batch: false,
    limit: 100,
    days: null,
    version: 'v1',
    model: 'gpt-4o-mini',
    dryRun: false,
    continueOnError: false,
    list: false,
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

    if (args[i] === '--ids' && args[i + 1]) {
      result.ids = args[i + 1]
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
      i++;
      continue;
    }

    if (args[i] === '--batch') {
      result.batch = true;
      continue;
    }

    if (args[i] === '--limit' && args[i + 1]) {
      const limit = Number.parseInt(args[i + 1], 10);
      if (Number.isNaN(limit) || limit < 1) {
        console.error(
          `Error: --limit must be a positive integer. Got "${args[i + 1]}"`,
        );
        process.exit(1);
      }
      result.limit = limit;
      i++;
      continue;
    }

    if (args[i] === '--days' && args[i + 1]) {
      const days = Number.parseInt(args[i + 1], 10);
      if (Number.isNaN(days) || days < 1) {
        console.error(
          `Error: --days must be a positive integer. Got "${args[i + 1]}"`,
        );
        process.exit(1);
      }
      result.days = days;
      i++;
      continue;
    }

    if (args[i] === '--version' && args[i + 1]) {
      result.version = args[i + 1];
      i++;
      continue;
    }

    if (args[i] === '--model' && args[i + 1]) {
      result.model = args[i + 1];
      i++;
      continue;
    }

    if (args[i] === '--dry-run') {
      result.dryRun = true;
      continue;
    }

    if (args[i] === '--continue') {
      result.continueOnError = true;
      continue;
    }

    console.error(`Error: Unknown argument "${args[i]}"`);
    console.error('Use --help for usage information');
    process.exit(1);
  }

  return result;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
Question Extraction CLI

Usage:
  bunx ts-node --require tsconfig-paths/register src/modules/question-analyses/cli/extraction.cli.ts [OPTIONS]

Options:
  --ids <id1,id2,...>   Comma-separated question-log IDs (required unless --batch or --list)
  --batch                Auto-discover questions without analysis
  --limit <n>            Max questions to process (for --batch, default: 100)
  --days <n>             Only questions from last N days (for --batch)
  --version <v>          Extraction version (default: v1)
  --model <name>         LLM model to use (default: gpt-4o-mini)
  --dry-run              Preview what would be extracted without actually running
  --continue             Don't stop on single errors
  --list                 List available question-log IDs from database
  --help, -h             Show this help message

Examples:
  # List available question logs
  bunx ts-node .../extraction.cli.ts --list

  # Extract from single question
  bunx ts-node .../extraction.cli.ts --ids 11111111-1111-1111-1111-111111111111

  # Extract from multiple questions
  bunx ts-node .../extraction.cli.ts --ids id1,id2,id3

  # Batch extract 100 questions without analysis
  bunx ts-node .../extraction.cli.ts --batch --limit 100

  # Batch extract from last 7 days with dry-run
  bunx ts-node .../extraction.cli.ts --batch --days 7 --dry-run

  # Extract with specific model
  bunx ts-node .../extraction.cli.ts --ids id1 --model gpt-4o --version v2
`);
}

/**
 * Validate UUID formats
 */
function validateUuids(ids: string[]): void {
  const invalidIds = ids.filter((id) => !isUUID(id, '4'));
  if (invalidIds.length > 0) {
    console.error('Error: Invalid UUID format:');
    invalidIds.forEach((id) => console.error(`  - ${id}`));
    console.error(
      '\nUUIDs must be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    );
    process.exit(1);
  }
}

// ============================================================================
// LIST QUESTION LOGS
// ============================================================================

/**
 * List available question-log IDs from database
 */
async function listQuestionLogs(): Promise<void> {
  const logger = new Logger('ExtractionCLI');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('Available Question Logs');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const questionLogRepo: IQuestionLogRepository = appContext.get(
      I_QUESTION_LOG_REPOSITORY_TOKEN,
    );
    const analysisRepo: IQuestionLogAnalysisRepository = appContext.get(
      I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN,
    );

    const logs = await questionLogRepo.findMany({ limit: 100 });

    if (logs.length === 0) {
      logger.warn('No question logs found in database.');
      await appContext.close();
      process.exit(0);
    }

    // Get analysis count for each log
    const logsWithAnalysisCount = await Promise.all(
      logs.map(async (log) => {
        const analyses = await analysisRepo.findByQuestionLogId(
          log.id as Identifier,
        );
        return {
          ...log,
          analysisCount: analyses.length,
        };
      }),
    );

    logger.log(`\nFound ${logs.length} recent question logs:\n`);

    for (const log of logsWithAnalysisCount) {
      const questionPreview =
        log.questionText.length > 60
          ? `${log.questionText.substring(0, 60)}...`
          : log.questionText;

      console.log(`  ID: ${log.id}`);
      console.log(`  Question: "${questionPreview}"`);
      console.log(`  Analyses: ${log.analysisCount}`);
      console.log(`  Created: ${log.createdAt.toISOString()}`);
      console.log('');
    }

    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nUsage: --ids <id1,id2,...> or --batch');
    console.log('');
  } finally {
    await appContext.close();
  }
}

// ============================================================================
// BATCH DISCOVERY
// ============================================================================

/**
 * Find question logs that need analysis
 */
async function findQuestionLogsForBatch(
  questionLogRepo: IQuestionLogRepository,
  analysisRepo: IQuestionLogAnalysisRepository,
  limit: number,
  days: number | null,
): Promise<string[]> {
  const logger = new Logger('ExtractionCLI');

  // Get all recent question logs
  const allLogs = await questionLogRepo.findMany({
    limit: limit * 2, // Get more than needed since we'll filter
  });

  logger.log(`Found ${allLogs.length} question logs in database`);

  // Filter by date if specified
  const dateCutoff = days
    ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    : null;

  const filteredLogs = dateCutoff
    ? allLogs.filter((log) => log.createdAt >= dateCutoff)
    : allLogs;

  if (dateCutoff) {
    logger.log(
      `Filtered to ${filteredLogs.length} logs from last ${days} days`,
    );
  }

  // Filter by classification: only RELEVANT questions worth extracting
  const relevantLogs = filteredLogs.filter((log) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const category = (log.metadata as any)?.classification?.category;
    return category === 'relevant';
  });

  logger.log(
    `Filtered to ${relevantLogs.length} RELEVANT logs (excluding irrelevant/dangerous)`,
  );

  // Find logs without analysis
  const logsWithoutAnalysis: string[] = [];

  for (const log of relevantLogs) {
    const analyses = await analysisRepo.findByQuestionLogId(
      log.id as Identifier,
    );
    if (analyses.length === 0) {
      logsWithoutAnalysis.push(log.id);
    }

    if (logsWithoutAnalysis.length >= limit) {
      break;
    }
  }

  logger.log(
    `Found ${logsWithoutAnalysis.length} question logs without analysis (all RELEVANT)`,
  );

  return logsWithoutAnalysis;
}

// ============================================================================
// EXTRACTION
// ============================================================================

/**
 * Extract entities from question logs
 */
async function extractFromQuestions(args: CliArgs): Promise<void> {
  const logger = new Logger('ExtractionCLI');

  // Validate arguments
  if (!args.batch && (!args.ids || args.ids.length === 0)) {
    console.error('Error: --ids or --batch is required');
    console.error('Use --help for usage information');
    process.exit(1);
  }

  // Get question log IDs
  let questionLogIds: string[] = [];

  if (args.batch) {
    // Auto-discover mode
    const appContext = await NestFactory.createApplicationContext(AppModule);

    try {
      const questionLogRepo: IQuestionLogRepository = appContext.get(
        I_QUESTION_LOG_REPOSITORY_TOKEN,
      );
      const analysisRepo: IQuestionLogAnalysisRepository = appContext.get(
        I_QUESTION_LOG_ANALYSIS_REPOSITORY_TOKEN,
      );

      questionLogIds = await findQuestionLogsForBatch(
        questionLogRepo,
        analysisRepo,
        args.limit,
        args.days,
      );

      if (questionLogIds.length === 0) {
        logger.warn('No question logs found matching criteria.');
        await appContext.close();
        process.exit(0);
      }

      await appContext.close();
    } catch (error) {
      logger.error('Failed to discover question logs:', error);
      await appContext.close();
      process.exit(1);
    }
  } else {
    // Use provided IDs
    questionLogIds = args.ids!;
    validateUuids(questionLogIds);
  }

  // Show extraction plan
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log('Question Extraction Plan');
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  logger.log(`Question Logs: ${questionLogIds.length}`);
  logger.log(`Extraction Version: ${args.version}`);
  logger.log(`Model: ${args.model}`);
  logger.log(`Dry Run: ${args.dryRun}`);
  logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (args.dryRun) {
    console.log('Questions to be processed:\n');
    for (const id of questionLogIds) {
      console.log(`  - ${id}`);
    }
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Dry run complete. No extractions performed.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  }

  // Perform extraction
  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const extractionService: IQuestionExtractionService = appContext.get(
      I_QUESTION_EXTRACTION_SERVICE_TOKEN,
    );

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < questionLogIds.length; i++) {
      const questionLogId = questionLogIds[i];
      const progress = `[${i + 1}/${questionLogIds.length}]`;

      try {
        logger.log(`${progress} Extracting from ${questionLogId}...`);

        const result = await extractionService.extractFromQuestion({
          questionLogId: questionLogId as Identifier,
          extractionVersion: args.version,
          model: args.model,
        });

        successCount++;
        logger.log(
          `  ✓ Quality: ${result.analysis.overallQuality}, Entities: ${result.entities.length}`,
        );
      } catch (error) {
        errorCount++;
        logger.error(
          `  ✗ Failed: ${error instanceof Error ? error.message : String(error)}`,
        );

        if (!args.continueOnError) {
          logger.error(
            'Stopping due to error. Use --continue to continue on errors.',
          );
          await appContext.close();
          process.exit(1);
        }
      }
    }

    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.log('Extraction Complete!');
    logger.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.log(`Total: ${questionLogIds.length}`);
    logger.log(`Success: ${successCount}`);
    logger.log(`Errors: ${errorCount}`);
    logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await appContext.close();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error:', error);
    await appContext.close();
    process.exit(1);
  }
}

// ============================================================================
// BOOTSTRAP
// ============================================================================

async function bootstrap(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.list) {
    await listQuestionLogs();
    process.exit(0);
  }

  await extractFromQuestions(args);
}

bootstrap().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
