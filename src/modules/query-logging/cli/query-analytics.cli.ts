import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../../app.module';
import { QueryAnalyticsService } from '../services/query-analytics.service';

/**
 * Query Analytics CLI
 *
 * Inspect query cost and token analytics from the command line.
 *
 * Usage:
 *   bunx ts-node --require tsconfig-paths/register src/modules/query-logging/cli/query-analytics.cli.ts [OPTIONS]
 *
 * Options:
 *   --avg, -a             Show average cost only
 *   --stats, -s           Show full statistics breakdown
 *   --runs <n>            Show per-run costs (default: 10)
 *   --help, -h            Show this help message
 *
 * Examples:
 *   # Show full summary
 *   bunx ts-node .../cost-analytics.cli.ts
 *
 *   # Show average cost only
 *   bunx ts-node .../cost-analytics.cli.ts --avg
 *
 *   # Show full statistics
 *   bunx ts-node .../cost-analytics.cli.ts --stats
 *
 *   # Show last 20 runs
 *   bunx ts-node .../cost-analytics.cli.ts --runs 20
 */

/**
 * CLI arguments interface
 */
interface CliArgs {
  avg: boolean;
  stats: boolean;
  runs: boolean;
  runsLimit: number;
  help: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    avg: false,
    stats: false,
    runs: false,
    runsLimit: 10,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help' || args[i] === '-h') {
      result.help = true;
      return result;
    }

    if (args[i] === '--avg' || args[i] === '-a') {
      result.avg = true;
      return result;
    }

    if (args[i] === '--stats' || args[i] === '-s') {
      result.stats = true;
      return result;
    }

    if (args[i] === '--runs') {
      result.runs = true;
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        result.runsLimit = Number.parseInt(args[i + 1], 10);
        i++;
      }
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
Query Analytics CLI

Query cost and token analytics from the database.

Usage:
  bunx ts-node --require tsconfig-paths/register src/modules/query-logging/cli/query-analytics.cli.ts [OPTIONS]

Options:
  --avg, -a             Show average cost only
  --stats, -s           Show full statistics breakdown
  --runs <n>            Show per-run costs (default: 10)
  --help, -h            Show this help message

Examples:
  # Show full summary
  bunx ts-node .../cost-analytics.cli.ts

  # Show average cost only
  bunx ts-node .../cost-analytics.cli.ts --avg

  # Show full statistics
  bunx ts-node .../cost-analytics.cli.ts --stats

  # Show last 20 runs
  bunx ts-node .../cost-analytics.cli.ts --runs 20
`);
}

/**
 * Show all cost analytics summary
 */
async function showSummary(): Promise<void> {
  console.log('═════════════════════════════════════════');
  console.log('Query Cost & Token Analytics Summary');
  console.log('═════════════════════════════════════════');

  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const analytics = appContext.get(QueryAnalyticsService);

    const avgCost = await analytics.getAverageCost();
    const costStats = await analytics.getCostBreakdownStats();
    const tokenStats = await analytics.getTokenBreakdownStats();

    console.log(`\n💰 Average Cost Per Query:`);
    console.log(`  LLM:       $${avgCost.llm.toFixed(4)}`);
    console.log(`  Embedding: $${avgCost.embedding.toFixed(4)}`);
    console.log(`  Total:     $${avgCost.total.toFixed(4)}`);

    console.log(`\n📊 Average Tokens Per Query:`);
    console.log(`  LLM Input:    ${tokenStats.llmInput.average.toFixed(0)}`);
    console.log(`  LLM Output:   ${tokenStats.llmOutput.average.toFixed(0)}`);
    console.log(`  LLM Total:    ${tokenStats.llmTotal.average.toFixed(0)}`);
    console.log(
      `  Embedding:    ${tokenStats.embeddingTotal.average.toFixed(0)}`,
    );
    console.log(`  Total:        ${tokenStats.total.average.toFixed(0)}`);

    console.log(`\n📈 Cost Statistics (${costStats.total.count} queries):`);
    console.log(`  Sum:       $${costStats.total.sum.toFixed(2)}`);
    console.log(`  Average:   $${costStats.total.average.toFixed(4)}`);
    console.log(`  Min:       $${costStats.total.min.toFixed(4)}`);
    console.log(`  Max:       $${costStats.total.max.toFixed(4)}`);

    console.log(`\n🔢 Token Statistics (${tokenStats.total.count} queries):`);
    console.log(`  Sum:       ${tokenStats.total.sum.toFixed(0)}`);
    console.log(`  Average:   ${tokenStats.total.average.toFixed(0)}`);
    console.log(`  Min:       ${tokenStats.total.min}`);
    console.log(`  Max:       ${tokenStats.total.max}`);
  } finally {
    await appContext.close();
  }
}

/**
 * Show average cost only
 */
async function showAverageCost(): Promise<void> {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const analytics = appContext.get(QueryAnalyticsService);
    const avgCost = await analytics.getAverageCost();

    console.log('═════════════════════════════════════════');
    console.log('Average Cost Per Completed Query');
    console.log('═════════════════════════════════════════');
    console.log(`LLM:       $${avgCost.llm.toFixed(4)}`);
    console.log(`Embedding: $${avgCost.embedding.toFixed(4)}`);
    console.log(`Total:     $${avgCost.total.toFixed(4)}`);
  } finally {
    await appContext.close();
  }
}

/**
 * Show full statistics breakdown
 */
async function showFullStats(): Promise<void> {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const analytics = appContext.get(QueryAnalyticsService);
    const costStats = await analytics.getCostBreakdownStats();
    const tokenStats = await analytics.getTokenBreakdownStats();

    console.log('═════════════════════════════════════════');
    console.log('Full Cost & Token Statistics Breakdown');
    console.log('═════════════════════════════════════════');

    console.log(`\n💰 LLM Costs:`);
    console.log(`  Count:   ${costStats.llm.count}`);
    console.log(`  Sum:     $${costStats.llm.sum.toFixed(2)}`);
    console.log(`  Average: $${costStats.llm.average.toFixed(4)}`);
    console.log(`  Min:     $${costStats.llm.min.toFixed(4)}`);
    console.log(`  Max:     $${costStats.llm.max.toFixed(4)}`);

    console.log(`\n💰 Embedding Costs:`);
    console.log(`  Count:   ${costStats.embedding.count}`);
    console.log(`  Sum:     $${costStats.embedding.sum.toFixed(2)}`);
    console.log(`  Average: $${costStats.embedding.average.toFixed(4)}`);
    console.log(`  Min:     $${costStats.embedding.min.toFixed(4)}`);
    console.log(`  Max:     $${costStats.embedding.max.toFixed(4)}`);

    console.log(`\n💰 Total Costs:`);
    console.log(`  Count:   ${costStats.total.count}`);
    console.log(`  Sum:     $${costStats.total.sum.toFixed(2)}`);
    console.log(`  Average: $${costStats.total.average.toFixed(4)}`);
    console.log(`  Min:     $${costStats.total.min.toFixed(4)}`);
    console.log(`  Max:     $${costStats.total.max.toFixed(4)}`);

    console.log(`\n🔢 LLM Input Tokens:`);
    console.log(`  Count:   ${tokenStats.llmInput.count}`);
    console.log(`  Sum:     ${tokenStats.llmInput.sum.toFixed(0)}`);
    console.log(`  Average: ${tokenStats.llmInput.average.toFixed(0)}`);
    console.log(`  Min:     ${tokenStats.llmInput.min}`);
    console.log(`  Max:     ${tokenStats.llmInput.max}`);

    console.log(`\n🔢 LLM Output Tokens:`);
    console.log(`  Count:   ${tokenStats.llmOutput.count}`);
    console.log(`  Sum:     ${tokenStats.llmOutput.sum.toFixed(0)}`);
    console.log(`  Average: ${tokenStats.llmOutput.average.toFixed(0)}`);
    console.log(`  Min:     ${tokenStats.llmOutput.min}`);
    console.log(`  Max:     ${tokenStats.llmOutput.max}`);

    console.log(`\n🔢 Embedding Tokens:`);
    console.log(`  Count:   ${tokenStats.embeddingTotal.count}`);
    console.log(`  Sum:     ${tokenStats.embeddingTotal.sum.toFixed(0)}`);
    console.log(`  Average: ${tokenStats.embeddingTotal.average.toFixed(0)}`);
    console.log(`  Min:     ${tokenStats.embeddingTotal.min}`);
    console.log(`  Max:     ${tokenStats.embeddingTotal.max}`);

    console.log(`\n🔢 Total Tokens:`);
    console.log(`  Count:   ${tokenStats.total.count}`);
    console.log(`  Sum:     ${tokenStats.total.sum.toFixed(0)}`);
    console.log(`  Average: ${tokenStats.total.average.toFixed(0)}`);
    console.log(`  Min:     ${tokenStats.total.min}`);
    console.log(`  Max:     ${tokenStats.total.max}`);
  } finally {
    await appContext.close();
  }
}

/**
 * Show per-run cost breakdown
 */
async function showPerRunCosts(limit: number): Promise<void> {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const analytics = appContext.get(QueryAnalyticsService);
    const runs = await analytics.getPerRunCosts(undefined, limit);

    console.log('═════════════════════════════════════════');
    console.log(`Per-Run Analytics (Last ${runs.length} queries)`);
    console.log('═════════════════════════════════════════');

    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      console.log(
        `\n${i + 1}. [${run.status}] ${run.question.substring(0, 60)}...`,
      );

      // Cost line
      console.log(
        `   💰 Cost: $${run.costs.total.toFixed(4)} (LLM: $${run.costs.llm?.toFixed(4) || '0.0000'}, Embed: $${run.costs.embedding?.toFixed(4) || '0.0000'})`,
      );

      // Token line
      if (run.tokens) {
        console.log(
          `   🔢 Tokens: ${run.tokens.total?.toFixed(0) || 'N/A'} (In: ${run.tokens.llm?.input || 'N/A'}, Out: ${run.tokens.llm?.output || 'N/A'}, Embed: ${run.tokens.embedding?.total || 'N/A'})`,
        );
      }

      console.log(
        `   ⏱️  Duration: ${run.duration ? `${(run.duration / 1000).toFixed(1)}s` : 'N/A'}`,
      );
      console.log(`   📅 Completed: ${run.completedAt.toISOString()}`);
    }
  } finally {
    await appContext.close();
  }
}

/**
 * Main bootstrap function
 */
async function bootstrap(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.avg) {
    await showAverageCost();
    process.exit(0);
  }

  if (args.stats) {
    await showFullStats();
    process.exit(0);
  }

  if (args.runs) {
    await showPerRunCosts(args.runsLimit);
    process.exit(0);
  }

  // Default: show summary
  await showSummary();
  process.exit(0);
}

void bootstrap();
