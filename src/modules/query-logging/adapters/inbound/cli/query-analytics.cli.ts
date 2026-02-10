import { NestFactory } from '@nestjs/core';

import Table from 'cli-table3';
import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import { AppModule } from '../../../../../app.module';
import { QueryAnalyticsService } from '../../../services/query-analytics.service';

// CLI display constants
const SKILL_COL_WIDTH = 20;
const FREQ_COL_WIDTH = 8;
const NUMERIC_COL_WIDTH = 10;
const SCORE_COL_WIDTH = 11;
const PERCENT_COL_WIDTH = 11;

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
 *   --distribution, -d    Show distribution analytics
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
 *
 *   # Show distribution analytics
 *   bunx ts-node .../query-analytics.cli.ts --distribution
 */

/**
 * CLI arguments interface
 */
interface CliArgs {
  avg: boolean;
  stats: boolean;
  runs: boolean;
  runsLimit: number;
  analytics: boolean;
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
    analytics: false,
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

    if (args[i] === '--analytics') {
      result.analytics = true;
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

Query cost, token, and analytics from the database.

Usage:
  bunx ts-node --require tsconfig-paths/register src/modules/query-logging/adapters/inbound/cli/query-analytics.cli.ts [OPTIONS]

Options:
  --avg, -a             Show average cost only
  --stats, -s           Show full statistics breakdown
  --runs <n>            Show per-run costs (default: 10)
  --analytics           Show 5-key analytics report
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

  # Show analytics report (5 key metrics)
  bunx ts-node .../query-analytics.cli.ts --analytics
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
 * Show analytics report with 5 key metrics
 */
async function showAnalytics(): Promise<void> {
  const appContext = await NestFactory.createApplicationContext(AppModule);

  try {
    const analytics = appContext.get(QueryAnalyticsService);
    const report = await analytics.getAnalyticsReport();

    console.log('═════════════════════════════════════════');
    console.log('Query Analytics Report (5 Key Metrics)');
    console.log('═════════════════════════════════════════');

    // Metric 1: Per-Skill Summary
    if (report.perSkillSummary.length > 0) {
      const skillTable = new Table({
        head: [
          'Skill',
          'Freq',
          'Retrieved',
          'Accepted',
          'Avg Score',
          'Accept Rate',
        ],
        colAligns: ['left', 'right', 'right', 'right', 'right', 'right'],
        chars: {
          top: '═',
          'top-mid': '╤',
          'top-left': '╔',
          'top-right': '╗',
          bottom: '═',
          'bottom-mid': '╧',
          'bottom-left': '╚',
          'bottom-right': '╝',
          left: '║',
          'left-mid': '╟',
          mid: '─',
          'mid-mid': '┼',
          right: '║',
          'right-mid': '╢',
          middle: '│',
        },
        style: { 'padding-left': 1, 'padding-right': 1 },
        wordWrap: true,
        colWidths: [
          SKILL_COL_WIDTH,
          FREQ_COL_WIDTH,
          NUMERIC_COL_WIDTH,
          NUMERIC_COL_WIDTH,
          SCORE_COL_WIDTH,
          PERCENT_COL_WIDTH,
        ],
      });

      for (const skill of report.perSkillSummary) {
        skillTable.push([
          skill.skill,
          String(skill.frequency),
          skill.avgRetrieved.toFixed(1),
          skill.avgAccepted.toFixed(1),
          skill.avgScore.toFixed(2),
          `${(skill.acceptRate * 100).toFixed(1)}%`,
        ]);
      }

      console.log('\n1. Per-Skill Summary:');
      console.log(skillTable.toString());
    }

    // Metric 2: Funnel Overview
    console.log('\n2. Funnel Overview:');
    console.log(
      `  Stage 3 (Retrieved):  ${report.funnelMetrics.retrieved} courses`,
    );
    console.log(
      `  Stage 4 (Accepted):   ${report.funnelMetrics.accepted} courses (${(report.funnelMetrics.acceptRate * 100).toFixed(1)}%)`,
    );
    console.log(
      `  Stage 5 (Unique):     ${report.funnelMetrics.unique} courses`,
    );

    // Metric 3: Top Overlapping Skills
    if (report.skillOverlaps.length > 0) {
      const overlapTable = new Table({
        head: ['Skill A', 'Skill B', 'Shared Courses'],
        colAligns: ['left', 'left', 'right'],
        chars: {
          top: '═',
          'top-mid': '╤',
          'top-left': '╔',
          'top-right': '╗',
          bottom: '═',
          'bottom-mid': '╧',
          'bottom-left': '╚',
          'bottom-right': '╝',
          left: '║',
          'left-mid': '╟',
          mid: '─',
          'mid-mid': '┼',
          right: '║',
          'right-mid': '╢',
          middle: '│',
        },
        style: { 'padding-left': 1, 'padding-right': 1 },
        wordWrap: true,
        colWidths: [SKILL_COL_WIDTH, SKILL_COL_WIDTH, NUMERIC_COL_WIDTH + 5],
      });

      for (const overlap of report.skillOverlaps) {
        overlapTable.push([
          overlap.skillA,
          overlap.skillB,
          String(overlap.sharedCourseCount),
        ]);
      }

      console.log('\n3. Top Overlapping Skills:');
      console.log(overlapTable.toString());
    }

    // Metric 4: Multi-CLO Acceptance
    if (report.multiCloAcceptance.length > 0) {
      const cloTable = new Table({
        head: ['CLO Count', 'Occurrences', 'Accepted', 'Accept Rate'],
        colAligns: ['left', 'right', 'right', 'right'],
        chars: {
          top: '═',
          'top-mid': '╤',
          'top-left': '╔',
          'top-right': '╗',
          bottom: '═',
          'bottom-mid': '╧',
          'bottom-left': '╚',
          'bottom-right': '╝',
          left: '║',
          'left-mid': '╟',
          mid: '─',
          'mid-mid': '┼',
          right: '║',
          'right-mid': '╢',
          middle: '│',
        },
        style: { 'padding-left': 1, 'padding-right': 1 },
        colWidths: [
          12,
          NUMERIC_COL_WIDTH,
          NUMERIC_COL_WIDTH,
          PERCENT_COL_WIDTH,
        ],
      });

      for (const clo of report.multiCloAcceptance) {
        cloTable.push([
          clo.cloCountLabel,
          String(clo.occurrences),
          String(clo.accepted),
          `${(clo.acceptRate * 100).toFixed(1)}%`,
        ]);
      }

      console.log('\n4. Multi-CLO Acceptance:');
      console.log(cloTable.toString());
    }

    // Metric 5: Score Distribution
    const scoreTable = new Table({
      head: ['Score', 'Count', 'Percentage'],
      colAligns: ['left', 'right', 'right'],
      chars: {
        top: '═',
        'top-mid': '╤',
        'top-left': '╔',
        'top-right': '╗',
        bottom: '═',
        'bottom-mid': '╧',
        'bottom-left': '╚',
        'bottom-right': '╝',
        left: '║',
        'left-mid': '╟',
        mid: '─',
        'mid-mid': '┼',
        right: '║',
        'right-mid': '╢',
        middle: '│',
      },
      style: { 'padding-left': 1, 'padding-right': 1 },
      colWidths: [10, NUMERIC_COL_WIDTH, PERCENT_COL_WIDTH],
    });

    for (const score of report.scoreDistribution) {
      scoreTable.push([
        `Score ${score.score}`,
        String(score.count),
        `${score.percentage.toFixed(1)}%`,
      ]);
    }

    console.log('\n5. Score Distribution:');
    console.log(scoreTable.toString());
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

  if (args.analytics) {
    await showAnalytics();
    process.exit(0);
  }

  // Default: show summary
  await showSummary();
  process.exit(0);
}

void bootstrap();
