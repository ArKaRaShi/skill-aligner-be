import { NestFactory } from '@nestjs/core';

import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import { AppModule } from '../../../../../app.module';
import { QueryAnalyticsService } from '../../../services/query-analytics.service';

/**
 * Query Analytics CLI
 *
 * Inspect query cost and token analytics from the command line.
 *
 * Usage:
 *   bunx ts-node --require tsconfig-paths/register src/modules/query-logging/adapters/inbound/cli/query-analytics.cli.ts [OPTIONS]
 *
 * Options:
 *   --avg, -a             Show average cost only
 *   --stats, -s           Show full statistics breakdown
 *   --runs <n>            Show per-run costs (default: 10)
 *   --help, -h            Show this help message
 *
 * Examples:
 *   # Show full summary
 *   bunx ts-node .../query-analytics.cli.ts
 *
 *   # Show average cost only
 *   bunx ts-node .../query-analytics.cli.ts --avg
 *
 *   # Show full statistics
 *   bunx ts-node .../query-analytics.cli.ts --stats
 *
 *   # Show last 20 runs
 *   bunx ts-node .../query-analytics.cli.ts --runs 20
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
  bunx ts-node --require tsconfig-paths/register src/modules/query-logging/adapters/inbound/cli/query-analytics.cli.ts [OPTIONS]

Options:
  --avg, -a             Show average cost only
  --stats, -s           Show full statistics breakdown
  --runs <n>            Show per-run costs (default: 10)
  --help, -h            Show this help message

Examples:
  # Show full summary
  bunx ts-node .../query-analytics.cli.ts

  # Show average cost only
  bunx ts-node .../query-analytics.cli.ts --avg

  # Show full statistics
  bunx ts-node .../query-analytics.cli.ts --stats

  # Show last 20 runs
  bunx ts-node .../query-analytics.cli.ts --runs 20
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
    console.log(`  LLM:       $${DecimalHelper.formatCost(avgCost.llm)}`);
    console.log(`  Embedding: $${DecimalHelper.formatCost(avgCost.embedding)}`);
    console.log(`  Total:     $${DecimalHelper.formatCost(avgCost.total)}`);

    console.log(`\n📊 Average Tokens Per Query:`);
    console.log(
      `  LLM Input:    ${tokenStats.llmInput.average.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(
      `  LLM Output:   ${tokenStats.llmOutput.average.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(
      `  LLM Total:    ${tokenStats.llmTotal.average.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(
      `  Embedding:    ${tokenStats.embeddingTotal.average.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(
      `  Total:        ${tokenStats.total.average.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );

    console.log(`\n📈 Cost Statistics (${costStats.total.count} queries):`);
    console.log(
      `  Sum:       $${costStats.total.sum.toFixed(DECIMAL_PRECISION.PERCENTAGE)}`,
    );
    console.log(
      `  Average:   $${DecimalHelper.formatCost(costStats.total.average)}`,
    );
    console.log(
      `  Min:       $${DecimalHelper.formatCost(costStats.total.min)}`,
    );
    console.log(
      `  Max:       $${DecimalHelper.formatCost(costStats.total.max)}`,
    );

    console.log(`\n🔢 Token Statistics (${tokenStats.total.count} queries):`);
    console.log(
      `  Sum:       ${tokenStats.total.sum.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(
      `  Average:   ${tokenStats.total.average.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
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
    console.log(`LLM:       $${DecimalHelper.formatCost(avgCost.llm)}`);
    console.log(`Embedding: $${DecimalHelper.formatCost(avgCost.embedding)}`);
    console.log(`Total:     $${DecimalHelper.formatCost(avgCost.total)}`);
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
    console.log(
      `  Sum:     $${costStats.llm.sum.toFixed(DECIMAL_PRECISION.PERCENTAGE)}`,
    );
    console.log(
      `  Average: $${DecimalHelper.formatCost(costStats.llm.average)}`,
    );
    console.log(`  Min:     $${DecimalHelper.formatCost(costStats.llm.min)}`);
    console.log(`  Max:     $${DecimalHelper.formatCost(costStats.llm.max)}`);

    console.log(`\n💰 Embedding Costs:`);
    console.log(`  Count:   ${costStats.embedding.count}`);
    console.log(
      `  Sum:     $${costStats.embedding.sum.toFixed(DECIMAL_PRECISION.PERCENTAGE)}`,
    );
    console.log(
      `  Average: $${DecimalHelper.formatCost(costStats.embedding.average)}`,
    );
    console.log(
      `  Min:     $${DecimalHelper.formatCost(costStats.embedding.min)}`,
    );
    console.log(
      `  Max:     $${DecimalHelper.formatCost(costStats.embedding.max)}`,
    );

    console.log(`\n💰 Total Costs:`);
    console.log(`  Count:   ${costStats.total.count}`);
    console.log(
      `  Sum:     $${costStats.total.sum.toFixed(DECIMAL_PRECISION.PERCENTAGE)}`,
    );
    console.log(
      `  Average: $${DecimalHelper.formatCost(costStats.total.average)}`,
    );
    console.log(`  Min:     $${DecimalHelper.formatCost(costStats.total.min)}`);
    console.log(`  Max:     $${DecimalHelper.formatCost(costStats.total.max)}`);

    console.log(`\n🔢 LLM Input Tokens:`);
    console.log(`  Count:   ${tokenStats.llmInput.count}`);
    console.log(
      `  Sum:     ${tokenStats.llmInput.sum.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(
      `  Average: ${tokenStats.llmInput.average.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(`  Min:     ${tokenStats.llmInput.min}`);
    console.log(`  Max:     ${tokenStats.llmInput.max}`);

    console.log(`\n🔢 LLM Output Tokens:`);
    console.log(`  Count:   ${tokenStats.llmOutput.count}`);
    console.log(
      `  Sum:     ${tokenStats.llmOutput.sum.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(
      `  Average: ${tokenStats.llmOutput.average.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(`  Min:     ${tokenStats.llmOutput.min}`);
    console.log(`  Max:     ${tokenStats.llmOutput.max}`);

    console.log(`\n🔢 Embedding Tokens:`);
    console.log(`  Count:   ${tokenStats.embeddingTotal.count}`);
    console.log(
      `  Sum:     ${tokenStats.embeddingTotal.sum.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(
      `  Average: ${tokenStats.embeddingTotal.average.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(`  Min:     ${tokenStats.embeddingTotal.min}`);
    console.log(`  Max:     ${tokenStats.embeddingTotal.max}`);

    console.log(`\n🔢 Total Tokens:`);
    console.log(`  Count:   ${tokenStats.total.count}`);
    console.log(
      `  Sum:     ${tokenStats.total.sum.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
    console.log(
      `  Average: ${tokenStats.total.average.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );
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
        `   💰 Cost: $${DecimalHelper.formatCost(run.costs.total)} (LLM: $${run.costs.llm ? DecimalHelper.formatCost(run.costs.llm) : '0.0000'}, Embed: $${run.costs.embedding ? DecimalHelper.formatCost(run.costs.embedding) : '0.0000'})`,
      );

      // Token line
      if (run.tokens) {
        console.log(
          `   🔢 Tokens: ${run.tokens.total ? run.tokens.total.toFixed(DECIMAL_PRECISION.TOKEN) : 'N/A'} (In: ${run.tokens.llm?.input || 'N/A'}, Out: ${run.tokens.llm?.output || 'N/A'}, Embed: ${run.tokens.embedding?.total || 'N/A'})`,
        );
      }

      console.log(
        `   ⏱️  Duration: ${run.duration ? DecimalHelper.formatTime(run.duration / 1000) : 'N/A'}`,
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
