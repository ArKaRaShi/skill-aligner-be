import { Injectable, Logger } from '@nestjs/common';

import { DECIMAL_PRECISION } from 'src/shared/utils/constants/decimal-precision.constants';
import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import type { IQueryLoggingRepository } from '../contracts/i-query-logging-repository.contract';
import { CostStatisticsHelper } from '../helpers/cost-statistics.helper';
import { DistributionStatisticsHelper } from '../helpers/distribution-statistics.helper';
import { PerRunCostSummarizerHelper } from '../helpers/per-run-cost-summarizer.helper';
import { TokenMapBreakdownHelper } from '../helpers/token-map-breakdown.helper';
import type {
  AggregationMetrics,
  CombinedAnalyticsReport,
  CorrelationMetrics,
  CostBreakdownStatistics,
  CostStatistics,
  DistributionAnalyticsReport,
  DistributionBucket,
  PerRunCostSummary,
  QueryAnalyticsOptions,
  QuestionLevelSummary,
  SkillLevelBreakdown,
  TokenBreakdownStatistics,
} from '../types/query-analytics.type';
import type {
  CourseAggregationStepOutput,
  CourseFilterMergedMetrics,
  CourseFilterStepOutput,
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

  constructor(private readonly repository: IQueryLoggingRepository) {}

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
   * Get comprehensive distribution analytics report.
   *
   * @param options - Optional filters for date range
   * @returns Complete distribution analytics with all metrics
   */
  async getDistributionAnalytics(
    options?: QueryAnalyticsOptions,
  ): Promise<DistributionAnalyticsReport> {
    this.logger.debug('Fetching distribution analytics', { options });

    const logs = await this.fetchLogsWithMetrics(options, ['COMPLETED']);

    if (logs.length === 0) {
      this.logger.warn('No completed logs found for distribution analytics');
      return this.getEmptyDistributionReport();
    }

    const result: DistributionAnalyticsReport = {
      questionLevel: this.computeQuestionLevelSummary(logs),
      skillLevel: await this.computeSkillLevelBreakdown(logs),
      aggregation: await this.computeAggregationMetrics(logs),
      correlation: this.computeCorrelationMetrics(logs),
      distributionBuckets: this.computeDistributionBuckets(logs),
    };

    this.logger.log(
      `Distribution analytics computed: ${result.questionLevel.totalQueries} queries, Avg courses=${result.questionLevel.avgCoursesReturned.toFixed(1)}`,
    );

    return result;
  }

  /**
   * Compute question-level summary statistics.
   *
   * @private
   */
  private computeQuestionLevelSummary(
    logs: QueryProcessLog[],
  ): QuestionLevelSummary {
    const coursesReturned: number[] = [];
    const skillsExtracted: number[] = [];
    const costs: number[] = [];
    const durations: number[] = [];

    for (const log of logs) {
      if (log.metrics?.counts?.coursesReturned != null) {
        coursesReturned.push(log.metrics.counts.coursesReturned);
      }
      if (log.metrics?.counts?.skillsExtracted != null) {
        skillsExtracted.push(log.metrics.counts.skillsExtracted);
      }
      if (log.totalCost != null) {
        costs.push(log.totalCost);
      }
      if (log.totalDuration != null) {
        durations.push(log.totalDuration);
      }
    }

    const coursesStats =
      DistributionStatisticsHelper.computeDistributionStats(coursesReturned);
    const skillsStats = CostStatisticsHelper.computeStatistics(skillsExtracted);
    const costsStats = CostStatisticsHelper.computeStatistics(costs);
    const durationsStats = CostStatisticsHelper.computeStatistics(durations);

    return {
      totalQueries: logs.length,
      avgCoursesReturned: coursesStats.average,
      minCoursesReturned: coursesStats.min,
      maxCoursesReturned: coursesStats.max,
      stdDevCoursesReturned: coursesStats.stdDev,
      avgSkillsExtracted: skillsStats.average,
      avgCostPerQuery: costsStats.average,
      avgDurationPerQuery: durationsStats.average,
    };
  }

  /**
   * Compute skill-level breakdown metrics.
   *
   * @private
   */
  private async computeSkillLevelBreakdown(
    logs: QueryProcessLog[],
  ): Promise<SkillLevelBreakdown[]> {
    // Fetch logs with steps to access filter step metrics
    const logsWithSteps: QueryProcessLogWithSteps[] = [];
    for (const log of logs) {
      const logWithSteps = await this.repository.findQueryLogById(log.id, true);
      if (logWithSteps && 'processSteps' in logWithSteps) {
        logsWithSteps.push(logWithSteps);
      }
    }

    const skillMetrics = new Map<
      string,
      {
        frequency: number;
        inputCounts: number[];
        acceptedCounts: number[];
        rejectedCounts: number[];
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
            this.addSkillMetric(skillMetrics, skillMetric);
          }
        } else if ('skill' in metrics) {
          // Single skill format
          this.addSkillMetric(skillMetrics, metrics);
        }
      }
    }

    // Convert to summary array
    return Array.from(skillMetrics.entries()).map(([skill, data]) => {
      const avgInput =
        data.inputCounts.reduce((a, b) => a + b, 0) / data.inputCounts.length;
      const avgAccepted =
        data.acceptedCounts.reduce((a, b) => a + b, 0) /
        data.acceptedCounts.length;
      const avgRejected =
        data.rejectedCounts.reduce((a, b) => a + b, 0) /
        data.rejectedCounts.length;
      const totalDecisions = avgAccepted + avgRejected;

      return {
        skill,
        frequency: data.frequency,
        avgCoursesRetrieved: avgInput,
        avgAcceptedCount: avgAccepted,
        avgRejectedCount: avgRejected,
        acceptanceRate: totalDecisions > 0 ? avgAccepted / totalDecisions : 0,
        rejectionRate: totalDecisions > 0 ? avgRejected / totalDecisions : 0,
      };
    });
  }

  /**
   * Add skill metric to the map.
   *
   * @private
   */
  private addSkillMetric(
    skillMetrics: Map<
      string,
      {
        frequency: number;
        inputCounts: number[];
        acceptedCounts: number[];
        rejectedCounts: number[];
      }
    >,
    metric: CourseFilterStepOutput,
  ): void {
    const skill = metric.skill || 'unknown';

    if (!skillMetrics.has(skill)) {
      skillMetrics.set(skill, {
        frequency: 0,
        inputCounts: [],
        acceptedCounts: [],
        rejectedCounts: [],
      });
    }

    const data = skillMetrics.get(skill)!;
    data.frequency++;
    data.inputCounts.push(metric.inputCount ?? 0);
    data.acceptedCounts.push(metric.acceptedCount ?? 0);
    data.rejectedCounts.push(metric.rejectedCount ?? 0);
  }

  /**
   * Compute aggregation metrics (fan-out, deduplication).
   *
   * @private
   */
  private async computeAggregationMetrics(
    logs: QueryProcessLog[],
  ): Promise<AggregationMetrics> {
    // Fetch logs with steps to access aggregation step metrics
    const logsWithSteps: QueryProcessLogWithSteps[] = [];
    for (const log of logs) {
      const logWithSteps = await this.repository.findQueryLogById(log.id, true);
      if (logWithSteps && 'processSteps' in logWithSteps) {
        logsWithSteps.push(logWithSteps);
      }
    }

    const rawCourses: number[] = [];
    const uniqueCourses: number[] = [];
    const duplicateRates: number[] = [];
    const closPerCourse: number[] = [];

    for (const log of logsWithSteps) {
      const steps = log.processSteps || [];

      for (const step of steps) {
        if (step.stepName !== 'COURSE_AGGREGATION' || !step.output?.metrics) {
          continue;
        }

        const metrics = step.output.metrics as CourseAggregationStepOutput;
        rawCourses.push(metrics.rawCourseCount ?? 0);
        uniqueCourses.push(metrics.uniqueCourseCount ?? 0);
        duplicateRates.push(metrics.duplicateRate ?? 0);

        // Calculate CLOs per course
        if (metrics.rawCourseCount && metrics.uniqueCourseCount) {
          closPerCourse.push(
            metrics.rawCourseCount / Math.max(metrics.uniqueCourseCount, 1),
          );
        }
      }
    }

    if (rawCourses.length === 0) {
      return {
        avgRawCourses: 0,
        avgUniqueCourses: 0,
        avgDuplicatesRemoved: 0,
        avgDuplicateRate: 0,
        avgClosPerCourse: 0,
      };
    }

    return {
      avgRawCourses: rawCourses.reduce((a, b) => a + b, 0) / rawCourses.length,
      avgUniqueCourses:
        uniqueCourses.reduce((a, b) => a + b, 0) / uniqueCourses.length,
      avgDuplicatesRemoved:
        rawCourses.reduce((a, b) => a + b, 0) / rawCourses.length -
        uniqueCourses.reduce((a, b) => a + b, 0) / uniqueCourses.length,
      avgDuplicateRate:
        duplicateRates.reduce((a, b) => a + b, 0) / duplicateRates.length,
      avgClosPerCourse:
        closPerCourse.reduce((a, b) => a + b, 0) / closPerCourse.length,
    };
  }

  /**
   * Compute correlation metrics.
   *
   * @private
   */
  private computeCorrelationMetrics(
    logs: QueryProcessLog[],
  ): CorrelationMetrics {
    const skillCounts: number[] = [];
    const courseCounts: number[] = [];
    const costs: number[] = [];

    for (const log of logs) {
      if (log.metrics?.counts?.skillsExtracted != null) {
        skillCounts.push(log.metrics.counts.skillsExtracted);
      }
      if (log.metrics?.counts?.coursesReturned != null) {
        courseCounts.push(log.metrics.counts.coursesReturned);
      }
      if (log.totalCost != null && log.metrics?.counts?.coursesReturned) {
        costs.push(
          log.totalCost / Math.max(log.metrics.counts.coursesReturned, 1),
        );
      }
    }

    const correlation = DistributionStatisticsHelper.computeCorrelation(
      skillCounts,
      courseCounts,
    );
    const costPerCourse =
      costs.reduce((a, b) => a + b, 0) / Math.max(costs.length, 1);
    const coursesPerSkill =
      courseCounts.reduce((a, b) => a + b, 0) /
      Math.max(
        skillCounts.reduce((a, b) => a + b, 0),
        1,
      );

    return {
      skillsVsCoursesCorrelation: correlation,
      costPerCourse,
      coursesPerSkill,
    };
  }

  /**
   * Compute distribution buckets (histogram).
   *
   * @private
   */
  private computeDistributionBuckets(
    logs: QueryProcessLog[],
  ): DistributionBucket[] {
    const courseCounts: number[] = [];

    for (const log of logs) {
      if (log.metrics?.counts?.coursesReturned != null) {
        courseCounts.push(log.metrics.counts.coursesReturned);
      }
    }

    if (courseCounts.length === 0) {
      return [];
    }

    return DistributionStatisticsHelper.createHistogram(courseCounts, 10);
  }

  /**
   * Get empty distribution report when no data available.
   *
   * @private
   */
  private getEmptyDistributionReport(): DistributionAnalyticsReport {
    return {
      questionLevel: {
        totalQueries: 0,
        avgCoursesReturned: 0,
        minCoursesReturned: 0,
        maxCoursesReturned: 0,
        stdDevCoursesReturned: 0,
        avgSkillsExtracted: 0,
        avgCostPerQuery: 0,
        avgDurationPerQuery: 0,
      },
      skillLevel: [],
      aggregation: {
        avgRawCourses: 0,
        avgUniqueCourses: 0,
        avgDuplicatesRemoved: 0,
        avgDuplicateRate: 0,
        avgClosPerCourse: 0,
      },
      correlation: {
        skillsVsCoursesCorrelation: 0,
        costPerCourse: 0,
        coursesPerSkill: 0,
      },
      distributionBuckets: [],
    };
  }
}
