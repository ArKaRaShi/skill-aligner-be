import { Injectable, Logger } from '@nestjs/common';

import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import type { IQueryLoggingRepository } from '../contracts/i-query-logging-repository.contract';
import { CostStatisticsHelper } from '../helpers/cost-statistics.helper';
import { PerRunCostSummarizerHelper } from '../helpers/per-run-cost-summarizer.helper';
import { TokenMapBreakdownHelper } from '../helpers/token-map-breakdown.helper';
import { QueryPipelineReaderService } from '../services/query-pipeline-reader.service';
import type {
  AnalyticsReport,
  CombinedAnalyticsReport,
  CostBreakdownStatistics,
  CostStatistics,
  FunnelMetrics,
  MultiCloAcceptance,
  PerRunCostSummary,
  PerSkillSummary,
  QueryAnalyticsOptions,
  ScoreDistribution,
  SkillOverlap,
  TokenBreakdownStatistics,
} from '../types/query-analytics.type';
import type {
  CourseAggregationStepOutput,
  CourseFilterMergedMetrics,
  CourseFilterStepOutput,
  CourseRetrievalRawOutput,
  QueryProcessLogWithSteps,
} from '../types/query-log-step.type';
import type { QueryProcessLog } from '../types/query-log.type';
import { QUERY_STATUS, type QueryStatus } from '../types/query-status.type';

/**
 * Query Analytics Service
 *
 * Orchestrates query log analytics by fetching logs and computing statistics.
 * Delegates parsing and transformation to helper classes.
 *
 * @example
 * ```ts
 * const analytics = await analyticsService.getCombinedAnalytics();
 * console.log(`Average LLM cost: $${analytics.costs.llm.average}`);
 * console.log(`Average LLM input tokens: ${analytics.tokens.llmInput.average}`);
 * ```
 */
@Injectable()
export class QueryAnalyticsService {
  private readonly logger = new Logger(QueryAnalyticsService.name);

  constructor(
    private readonly repository: IQueryLoggingRepository,
    private readonly pipelineReader: QueryPipelineReaderService,
  ) {}

  /**
   * Get average cost per completed query.
   *
   * @param options - Optional filters for date range
   * @returns Average cost breakdown (llm, embedding, total)
   */
  async getAverageCost(
    options?: Omit<QueryAnalyticsOptions, 'status'>,
  ): Promise<{ llm: number; embedding: number; total: number }> {
    this.logger.debug('Computing average cost', { options });

    const logs = await this.fetchLogsWithMetrics(options, ['COMPLETED']);

    if (logs.length === 0) {
      this.logger.warn('No completed logs found for average cost computation');
      return { llm: 0, embedding: 0, total: 0 };
    }

    const stats = this.computeCostBreakdownStats(logs);

    const result = {
      llm: stats.llm.average,
      embedding: stats.embedding.average,
      total: stats.total.average,
    };

    this.logger.log(
      `Average cost computed from ${logs.length} queries: LLM=$${DecimalHelper.formatCost(result.llm)}, Embedding=$${DecimalHelper.formatCost(result.embedding)}, Total=$${DecimalHelper.formatCost(result.total)}`,
    );

    return result;
  }

  /**
   * Get comprehensive cost breakdown statistics.
   *
   * @param options - Optional filters for date range and status
   * @returns Full cost breakdown statistics with count, sum, average, min, max
   */
  async getCostBreakdownStats(
    options?: QueryAnalyticsOptions,
  ): Promise<CostBreakdownStatistics> {
    this.logger.debug('Fetching cost breakdown statistics', { options });

    const logs = await this.fetchLogsWithMetrics(options);

    if (logs.length === 0) {
      this.logger.warn('No logs found for cost breakdown statistics');
    }

    const result = this.computeCostBreakdownStats(logs);

    this.logger.log(
      `Cost breakdown stats computed: ${result.total.count} queries, Total=$${DecimalHelper.formatCost(result.total.sum)}`,
    );

    return result;
  }

  /**
   * Get comprehensive token breakdown statistics.
   *
   * @param options - Optional filters for date range and status
   * @returns Full token breakdown statistics with count, sum, average, min, max
   */
  async getTokenBreakdownStats(
    options?: QueryAnalyticsOptions,
  ): Promise<TokenBreakdownStatistics> {
    this.logger.debug('Fetching token breakdown statistics', { options });

    const logs = await this.fetchLogsWithMetrics(options);

    if (logs.length === 0) {
      this.logger.warn('No logs found for token breakdown statistics');
    }

    const result = this.computeTokenBreakdownStats(logs);

    this.logger.log(
      `Token breakdown stats computed: ${result.total.count} queries, Total=${result.total.sum.toFixed(DECIMAL_PRECISION.TOKEN)} tokens`,
    );

    return result;
  }

  /**
   * Get combined analytics with both cost and token statistics.
   *
   * @param options - Optional filters for date range and status
   * @returns Combined report with cost and token statistics
   */
  async getCombinedAnalytics(
    options?: QueryAnalyticsOptions,
  ): Promise<CombinedAnalyticsReport> {
    this.logger.debug('Fetching combined analytics', { options });

    const logs = await this.fetchLogsWithMetrics(options);

    if (logs.length === 0) {
      this.logger.warn('No logs found for combined analytics');
    }

    const result = {
      costs: this.computeCostBreakdownStats(logs),
      tokens: this.computeTokenBreakdownStats(logs),
    };

    this.logger.log(
      `Combined analytics computed: ${result.costs.total.count} queries, Total Cost=$${DecimalHelper.formatCost(result.costs.total.sum)}, Total Tokens=${result.tokens.total.sum.toFixed(DECIMAL_PRECISION.TOKEN)}`,
    );

    return result;
  }

  /**
   * Get per-run cost summary for individual logs.
   *
   * @param options - Optional filters
   * @param limit - Maximum number of logs to return (default: 100)
   * @returns Array of per-run cost summaries
   */
  async getPerRunCosts(
    options?: QueryAnalyticsOptions,
    limit = 100,
  ): Promise<PerRunCostSummary[]> {
    this.logger.debug('Fetching per-run costs', { options, limit });

    const logs = await this.fetchLogsWithMetrics(options, null, limit);
    const summaries = PerRunCostSummarizerHelper.toSummaryArray(logs);

    this.logger.log(
      `Per-run costs computed: ${summaries.length} runs (limit: ${limit})`,
    );

    return summaries;
  }

  /**
   * Fetch logs from repository with default options.
   *
   * @private
   */
  private async fetchLogsWithMetrics(
    options?: QueryAnalyticsOptions,
    defaultStatus: QueryStatus[] | null = [QUERY_STATUS.COMPLETED],
    limit?: number,
  ): Promise<QueryProcessLog[]> {
    return this.repository.findManyWithMetrics({
      ...options,
      status: options?.status ?? defaultStatus ?? undefined,
      hasMetrics: true,
      ...(limit ? { take: limit } : {}),
    });
  }

  /**
   * Compute cost breakdown statistics from an array of logs.
   *
   * @private
   */
  private computeCostBreakdownStats(
    logs: QueryProcessLog[],
  ): CostBreakdownStatistics {
    const llmCosts: number[] = [];
    const embeddingCosts: number[] = [];
    const totalCosts: number[] = [];

    for (const log of logs) {
      if (log.totalCost == null) continue;

      totalCosts.push(log.totalCost);

      const breakdown = TokenMapBreakdownHelper.extractBreakdown(
        log.metrics?.tokenMap,
      );

      if (breakdown.llmCost > 0) llmCosts.push(breakdown.llmCost);
      if (breakdown.embeddingCost > 0)
        embeddingCosts.push(breakdown.embeddingCost);
    }

    return {
      llm: this.computeStatsFromArray(llmCosts),
      embedding: this.computeStatsFromArray(embeddingCosts),
      total: this.computeStatsFromArray(totalCosts),
    };
  }

  /**
   * Compute statistics from an array, handling empty arrays.
   *
   * @private
   */
  private computeStatsFromArray(values: number[]): CostStatistics {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
      };
    }
    return CostStatisticsHelper.computeStatistics(values);
  }

  /**
   * Compute token breakdown statistics from an array of logs.
   *
   * @private
   */
  private computeTokenBreakdownStats(
    logs: QueryProcessLog[],
  ): TokenBreakdownStatistics {
    const llmInputTokens: number[] = [];
    const llmOutputTokens: number[] = [];
    const llmTotalTokens: number[] = [];
    const embeddingTokens: number[] = [];
    const totalTokens: number[] = [];

    for (const log of logs) {
      if (log.totalTokens == null) continue;

      totalTokens.push(log.totalTokens);

      const breakdown = TokenMapBreakdownHelper.extractBreakdown(
        log.metrics?.tokenMap,
      );

      const llmTotal = breakdown.llmInput + breakdown.llmOutput;
      if (llmTotal > 0) {
        llmInputTokens.push(breakdown.llmInput);
        llmOutputTokens.push(breakdown.llmOutput);
        llmTotalTokens.push(llmTotal);
      }
      if (breakdown.embeddingTokens > 0) {
        embeddingTokens.push(breakdown.embeddingTokens);
      }
    }

    return {
      llmInput: this.computeStatsFromArray(llmInputTokens),
      llmOutput: this.computeStatsFromArray(llmOutputTokens),
      llmTotal: this.computeStatsFromArray(llmTotalTokens),
      embeddingTotal: this.computeStatsFromArray(embeddingTokens),
      total: this.computeStatsFromArray(totalTokens),
    };
  }

  /**
   * Get comprehensive analytics report with 5 key metrics.
   *
   * @param options - Optional filters for date range
   * @returns AnalyticsReport with per-skill, funnel, overlap, multi-CLO, and score metrics
   */
  async getAnalyticsReport(
    options?: QueryAnalyticsOptions,
  ): Promise<AnalyticsReport> {
    this.logger.debug('Fetching analytics report', { options });

    const logs = await this.fetchLogsWithMetrics(options, ['COMPLETED']);

    if (logs.length === 0) {
      this.logger.warn('No completed logs found for analytics report');
      return this.getEmptyReport();
    }

    const result: AnalyticsReport = {
      perSkillSummary: await this.computePerSkillSummary(logs),
      funnelMetrics: await this.computeFunnelMetrics(logs),
      skillOverlaps: await this.computeSkillOverlaps(logs),
      multiCloAcceptance: await this.computeMultiCloAcceptance(logs),
      scoreDistribution: await this.computeScoreDistribution(logs),
    };

    this.logger.log(
      `Analytics report computed: ${result.perSkillSummary.length} skills, Funnel: ${result.funnelMetrics.retrieved}→${result.funnelMetrics.accepted}→${result.funnelMetrics.unique}`,
    );

    return result;
  }

  // ==========================================================================
  // PRIVATE COMPUTATION METHODS
  // ==========================================================================

  /**
   * Compute per-skill performance summary.
   * Data source: Stage 4 (COURSE_RELEVANCE_FILTER) - allSkillsMetrics
   *
   * @private
   */
  private async computePerSkillSummary(
    logs: QueryProcessLog[],
  ): Promise<PerSkillSummary[]> {
    // Fetch logs with steps to access filter step metrics
    const logsWithSteps: QueryProcessLogWithSteps[] = [];
    for (const log of logs) {
      const logWithSteps = await this.pipelineReader.getQueryLogById(
        log.id,
        true,
      ); // Silent mode for batch
      if (logWithSteps) {
        logsWithSteps.push(logWithSteps);
      }
    }

    const skillMetrics = new Map<
      string,
      {
        frequency: number;
        retrievedCounts: number[];
        acceptedCounts: number[];
        scores: number[];
      }
    >();

    for (const log of logsWithSteps) {
      const steps = log.processSteps || [];

      for (const step of steps) {
        // Skip non-filter steps or steps without metrics
        if (
          step.stepName !== 'COURSE_RELEVANCE_FILTER' ||
          !step.output?.metrics
        ) {
          continue;
        }

        // Handle both single skill and merged metrics formats
        const metrics = step.output.metrics;
        if ('allSkillsMetrics' in metrics) {
          // Merged metrics format (multiple skills in one step)
          const mergedMetrics = metrics as CourseFilterMergedMetrics;
          for (const skillMetric of mergedMetrics.allSkillsMetrics) {
            this.addPerSkillMetric(skillMetrics, skillMetric);
          }
        } else if ('skill' in metrics) {
          // Single skill format
          this.addPerSkillMetric(skillMetrics, metrics);
        }
      }
    }

    // Convert to summary array
    return Array.from(skillMetrics.entries())
      .map(([skill, data]) => {
        const avgRetrieved =
          data.retrievedCounts.reduce((a, b) => a + b, 0) /
          data.retrievedCounts.length;
        const avgAccepted =
          data.acceptedCounts.reduce((a, b) => a + b, 0) /
          data.acceptedCounts.length;
        const avgScore =
          data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        const acceptRate = avgRetrieved > 0 ? avgAccepted / avgRetrieved : 0;

        return {
          skill,
          frequency: data.frequency,
          avgRetrieved,
          avgAccepted,
          avgScore,
          acceptRate,
        };
      })
      .sort((a, b) => b.frequency - a.frequency); // Sort by frequency desc
  }

  /**
   * Add per-skill metric to the map.
   *
   * @private
   */
  private addPerSkillMetric(
    skillMetrics: Map<
      string,
      {
        frequency: number;
        retrievedCounts: number[];
        acceptedCounts: number[];
        scores: number[];
      }
    >,
    metric: CourseFilterStepOutput,
  ): void {
    const skill = metric.skill || 'unknown';

    if (!skillMetrics.has(skill)) {
      skillMetrics.set(skill, {
        frequency: 0,
        retrievedCounts: [],
        acceptedCounts: [],
        scores: [],
      });
    }

    const data = skillMetrics.get(skill)!;
    data.frequency++;
    data.retrievedCounts.push(metric.inputCount ?? 0);
    data.acceptedCounts.push(metric.acceptedCount ?? 0);

    // Calculate average score from score distribution
    // Note: scoreDistribution only has score1, score2, score3 (accepted courses)
    // Score 0 (rejected) is tracked separately via rejectedCount
    const scoreDist = metric.scoreDistribution;
    if (scoreDist) {
      const totalScore =
        (scoreDist.score1 ?? 0) * 1 +
        (scoreDist.score2 ?? 0) * 2 +
        (scoreDist.score3 ?? 0) * 3;
      const acceptedCount =
        (scoreDist.score1 ?? 0) +
        (scoreDist.score2 ?? 0) +
        (scoreDist.score3 ?? 0);
      data.scores.push(acceptedCount > 0 ? totalScore / acceptedCount : 0);
    } else {
      data.scores.push(metric.avgScore ?? 0);
    }
  }

  /**
   * Compute funnel metrics (Stage 3 → 4 → 5).
   * Data source: Stage 3, 4, 5 step outputs
   *
   * @private
   */
  private async computeFunnelMetrics(
    logs: QueryProcessLog[],
  ): Promise<FunnelMetrics> {
    // Fetch logs with steps
    const logsWithSteps: QueryProcessLogWithSteps[] = [];
    for (const log of logs) {
      const logWithSteps = await this.pipelineReader.getQueryLogById(
        log.id,
        true,
      ); // Silent mode for batch
      if (logWithSteps) {
        logsWithSteps.push(logWithSteps);
      }
    }

    let totalRetrieved = 0;
    let totalAccepted = 0;
    let totalUnique = 0;

    for (const log of logsWithSteps) {
      const steps = log.processSteps || [];

      for (const step of steps) {
        // Stage 4: COURSE_RELEVANCE_FILTER
        if (
          step.stepName === 'COURSE_RELEVANCE_FILTER' &&
          step.output?.metrics
        ) {
          const metrics = step.output.metrics;
          if ('allSkillsMetrics' in metrics) {
            // Merged metrics format
            const mergedMetrics = metrics as CourseFilterMergedMetrics;
            for (const skillMetric of mergedMetrics.allSkillsMetrics) {
              totalRetrieved += skillMetric.inputCount ?? 0;
              totalAccepted += skillMetric.acceptedCount ?? 0;
            }
          } else if ('inputCount' in metrics) {
            // Single skill format
            totalRetrieved += metrics.inputCount ?? 0;
            totalAccepted += metrics.acceptedCount ?? 0;
          }
        }

        // Stage 5: COURSE_AGGREGATION
        if (step.stepName === 'COURSE_AGGREGATION' && step.output?.metrics) {
          const aggMetrics = step.output.metrics as CourseAggregationStepOutput;
          totalUnique += aggMetrics.uniqueCourseCount ?? 0;
        }
      }
    }

    const acceptRate = totalRetrieved > 0 ? totalAccepted / totalRetrieved : 0;

    return {
      retrieved: totalRetrieved,
      accepted: totalAccepted,
      unique: totalUnique,
      acceptRate,
    };
  }

  /**
   * Compute skill-pair overlaps.
   * Data source: Stage 5 (COURSE_AGGREGATION) - courses with skillCount > 1
   *
   * @private
   */
  private async computeSkillOverlaps(
    logs: QueryProcessLog[],
  ): Promise<SkillOverlap[]> {
    // Fetch logs with steps
    const logsWithSteps: QueryProcessLogWithSteps[] = [];
    for (const log of logs) {
      const logWithSteps = await this.pipelineReader.getQueryLogById(
        log.id,
        true,
      ); // Silent mode for batch
      if (logWithSteps) {
        logsWithSteps.push(logWithSteps);
      }
    }

    // Track skill pairs and their overlap counts
    const skillPairOverlaps = new Map<string, number>();

    for (const log of logsWithSteps) {
      const steps = log.processSteps || [];

      for (const step of steps) {
        if (step.stepName !== 'COURSE_AGGREGATION' || !step.output?.metrics) {
          continue;
        }

        const metrics = step.output.metrics as CourseAggregationStepOutput;
        if (!metrics.courses) {
          continue;
        }

        for (const course of metrics.courses) {
          // Only consider courses claimed by multiple skills
          if (course.skillCount && course.skillCount > 1) {
            const allSkills = [
              ...(course.winningSkills || []),
              ...(course.otherSkills || []),
            ];

            // Count each unique pair
            for (let i = 0; i < allSkills.length; i++) {
              for (let j = i + 1; j < allSkills.length; j++) {
                const skillA = allSkills[i];
                const skillB = allSkills[j];
                // Create normalized key (alphabetical order)
                const key =
                  skillA < skillB
                    ? `${skillA}|${skillB}`
                    : `${skillB}|${skillA}`;
                skillPairOverlaps.set(
                  key,
                  (skillPairOverlaps.get(key) || 0) + 1,
                );
              }
            }
          }
        }
      }
    }

    // Convert to array and sort by overlap count desc
    return Array.from(skillPairOverlaps.entries())
      .map(([key, count]) => {
        const [skillA, skillB] = key.split('|');
        return { skillA, skillB, sharedCourseCount: count };
      })
      .sort((a, b) => b.sharedCourseCount - a.sharedCourseCount)
      .slice(0, 10); // Top 10 overlaps
  }

  /**
   * Compute multi-CLO acceptance patterns.
   * Data source: Stage 3 → Stage 4, grouped by matchedLearningOutcomes.length
   *
   * @private
   */
  private async computeMultiCloAcceptance(
    logs: QueryProcessLog[],
  ): Promise<MultiCloAcceptance[]> {
    // Fetch logs with properly parsed steps using pipelineReader
    const logsWithSteps: QueryProcessLogWithSteps[] = [];
    for (const log of logs) {
      const logWithSteps = await this.pipelineReader.getQueryLogById(
        log.id,
        true,
      ); // Silent mode for batch
      if (logWithSteps) {
        logsWithSteps.push(logWithSteps);
      }
    }

    // Track by CLO count
    const cloCountMap = new Map<
      number,
      { occurrences: number; accepted: number }
    >();

    for (const log of logsWithSteps) {
      const steps = log.processSteps || [];

      // We need to correlate Stage 3 (retrieval) with Stage 4 (filter)
      // For simplicity, we'll use Stage 4 data which has both input and accepted counts
      // And we'll need Stage 3 data to get CLO counts

      const stage3Step = steps.find((s) => s.stepName === 'COURSE_RETRIEVAL');
      const stage4Step = steps.find(
        (s) => s.stepName === 'COURSE_RELEVANCE_FILTER',
      );

      if (!stage3Step?.output?.raw || !stage4Step?.output?.metrics) {
        continue;
      }

      // Stage 3 raw output has skillCoursesMap with matchedLearningOutcomes
      // pipelineReader properly parses this and reconstructs the Map
      const raw = stage3Step.output.raw as CourseRetrievalRawOutput;

      if (!raw.skillCoursesMap) {
        continue;
      }

      // coursesBySkill is now a proper Map thanks to pipelineReader parsing
      const coursesBySkill = raw.skillCoursesMap;

      // For each skill, count CLOs per course
      for (const [skill, courses] of coursesBySkill.entries()) {
        for (const course of courses) {
          const cloCount = course.matchedLearningOutcomes?.length ?? 1;
          const groupedCount = cloCount >= 3 ? 3 : cloCount;

          if (!cloCountMap.has(groupedCount)) {
            cloCountMap.set(groupedCount, { occurrences: 0, accepted: 0 });
          }

          const data = cloCountMap.get(groupedCount)!;
          data.occurrences++;

          // Estimate acceptance based on average accept rate from Stage 4
          // This is a simplification - in practice, you'd need course-level tracking
          const metrics = stage4Step.output.metrics;
          let acceptRate = 0;

          if ('allSkillsMetrics' in metrics) {
            const mergedMetrics = metrics as CourseFilterMergedMetrics;
            const skillMetric = mergedMetrics.allSkillsMetrics.find(
              (m) => m.skill === skill,
            );
            if (skillMetric) {
              const total = skillMetric.inputCount ?? 0;
              const accepted = skillMetric.acceptedCount ?? 0;
              acceptRate = total > 0 ? accepted / total : 0;
            }
          }

          // Apply acceptance rate (probabilistic)
          if (Math.random() < acceptRate) {
            data.accepted++;
          }
        }
      }
    }

    // Convert to array
    return Array.from(cloCountMap.entries())
      .map(([cloCount, data]) => ({
        cloCount,
        cloCountLabel:
          cloCount === 1 ? '1 CLO' : cloCount === 2 ? '2 CLOs' : '3+ CLOs',
        occurrences: data.occurrences,
        accepted: data.accepted,
        acceptRate: data.occurrences > 0 ? data.accepted / data.occurrences : 0,
      }))
      .sort((a, b) => a.cloCount - b.cloCount);
  }

  /**
   * Compute score distribution.
   * Data source: Stage 4 score distributions
   * Note: scoreDistribution only has score1, score2, score3 (accepted courses)
   * Score 0 (rejected) is calculated from rejectedCount
   *
   * @private
   */
  private async computeScoreDistribution(
    logs: QueryProcessLog[],
  ): Promise<ScoreDistribution[]> {
    // Fetch logs with steps
    const logsWithSteps: QueryProcessLogWithSteps[] = [];
    for (const log of logs) {
      const logWithSteps = await this.pipelineReader.getQueryLogById(
        log.id,
        true,
      ); // Silent mode for batch
      if (logWithSteps) {
        logsWithSteps.push(logWithSteps);
      }
    }

    const scoreCounts = [0, 0, 0, 0]; // Index = score

    for (const log of logsWithSteps) {
      const steps = log.processSteps || [];

      for (const step of steps) {
        if (
          step.stepName !== 'COURSE_RELEVANCE_FILTER' ||
          !step.output?.metrics
        ) {
          continue;
        }

        const metrics = step.output.metrics;
        if ('allSkillsMetrics' in metrics) {
          // Merged metrics format
          const mergedMetrics = metrics as CourseFilterMergedMetrics;
          for (const skillMetric of mergedMetrics.allSkillsMetrics) {
            // Score 0 = rejected courses (not in scoreDistribution)
            scoreCounts[0] += skillMetric.rejectedCount ?? 0;

            // Scores 1-3 from scoreDistribution (accepted courses)
            const dist = skillMetric.scoreDistribution;
            if (dist) {
              scoreCounts[1] += dist.score1 ?? 0;
              scoreCounts[2] += dist.score2 ?? 0;
              scoreCounts[3] += dist.score3 ?? 0;
            }
          }
        } else if ('scoreDistribution' in metrics) {
          // Single skill format
          const filterMetrics = metrics as CourseFilterStepOutput;
          // Score 0 = rejected courses
          scoreCounts[0] += filterMetrics.rejectedCount ?? 0;

          // Scores 1-3 from scoreDistribution
          const dist = filterMetrics.scoreDistribution;
          if (dist) {
            scoreCounts[1] += dist.score1 ?? 0;
            scoreCounts[2] += dist.score2 ?? 0;
            scoreCounts[3] += dist.score3 ?? 0;
          }
        }
      }
    }

    const total = scoreCounts.reduce((a, b) => a + b, 0);

    return scoreCounts.map((count, score) => ({
      score,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  /**
   * Get empty report when no data available.
   *
   * @private
   */
  private getEmptyReport(): AnalyticsReport {
    return {
      perSkillSummary: [],
      funnelMetrics: {
        retrieved: 0,
        accepted: 0,
        unique: 0,
        acceptRate: 0,
      },
      skillOverlaps: [],
      multiCloAcceptance: [],
      scoreDistribution: [
        { score: 0, count: 0, percentage: 0 },
        { score: 1, count: 0, percentage: 0 },
        { score: 2, count: 0, percentage: 0 },
        { score: 3, count: 0, percentage: 0 },
      ],
    };
  }
}
