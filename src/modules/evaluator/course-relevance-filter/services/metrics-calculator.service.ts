import { Injectable, Logger } from '@nestjs/common';

import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import type {
  ConfusionMatrix,
  CourseComparisonRecord,
  EvaluationMetrics,
  PerSampleMetrics,
  SampleEvaluationRecord,
  ScoreDistribution,
  ScoreVerdictBreakdown,
  ThresholdSweep,
} from '../types/course-relevance-filter.types';

// ============================================================================
// METRICS CALCULATOR SERVICE
// ============================================================================

/**
 * Calculates evaluation metrics from comparison records.
 *
 * Transforms raw comparison records into structured metrics including:
 * - Overall agreement rate
 * - Noise removal efficiency
 * - Exploratory recall
 * - Conservative drop rate
 * - Score distribution
 * - Confusion matrix
 */
@Injectable()
export class CourseFilterMetricsCalculator {
  private readonly logger = new Logger(CourseFilterMetricsCalculator.name);

  /**
   * Calculate all metrics from sample records.
   *
   * @param records - Sample evaluation records (with system + judge comparisons)
   * @returns Complete evaluation metrics
   */
  calculateFromRecords(records: SampleEvaluationRecord[]): EvaluationMetrics {
    this.logger.log(`Calculating metrics from ${records.length} samples`);

    // Flatten all course comparisons
    const allCourses: CourseComparisonRecord[] = records.flatMap(
      (record) => record.courses,
    );

    if (allCourses.length === 0) {
      this.logger.warn('No courses to calculate metrics from');
      return this.createEmptyMetrics();
    }

    // Calculate confusion matrix and metrics
    const confusionMatrix = this.calculateConfusionMatrix(allCourses);
    const scoreDistribution = this.calculateScoreDistribution(allCourses);

    // Calculate new diagnostic metrics
    const scoreVerdictBreakdown =
      this.calculateScoreVerdictBreakdown(allCourses);
    const perSampleMetrics = this.calculatePerSampleMetrics(records);
    const thresholdSweep = this.calculateThresholdSweep(allCourses);

    return {
      sampleCount: records.length,
      totalCoursesEvaluated: allCourses.length,
      overallAgreementRate: this.calculateOverallAgreementRate(confusionMatrix),
      noiseRemovalEfficiency:
        this.calculateNoiseRemovalEfficiency(confusionMatrix),
      exploratoryRecall: this.calculateExploratoryRecall(confusionMatrix),
      conservativeDropRate: this.calculateConservativeDropRate(confusionMatrix),
      systemScoreDistribution: scoreDistribution,
      confusionMatrix,
      // New diagnostic metrics
      scoreVerdictBreakdown,
      perSampleMetrics,
      thresholdSweep,
    };
  }

  /**
   * Calculate 2x2 confusion matrix: Judge (rows) vs System Action (columns).
   *
   * Matrix layout:
   *                    System DROP  System KEEP
   *   Judge FAIL        [0,0]        [0,1]
   *   Judge PASS        [1,0]        [1,1]
   *
   * Where:
   * - [0,0] = BOTH_DROP (agreement)
   * - [0,1] = EXPLORATORY_DELTA (disagreement)
   * - [1,0] = CONSERVATIVE_DROP (disagreement)
   * - [1,1] = BOTH_KEEP (agreement)
   */
  private calculateConfusionMatrix(
    courses: CourseComparisonRecord[],
  ): ConfusionMatrix {
    // Initialize matrix
    const matrix = [
      [0, 0], // Judge FAIL row: [BOTH_DROP, EXPLORATORY_DELTA]
      [0, 0], // Judge PASS row: [CONSERVATIVE_DROP, BOTH_KEEP]
    ];

    let systemDrop = 0;
    let systemKeep = 0;
    let judgeFail = 0;
    let judgePass = 0;

    // Fill matrix and count totals
    for (const course of courses) {
      const systemAction = course.system.action;
      const judgeVerdict = course.judge.verdict;

      // Update matrix
      if (judgeVerdict === 'FAIL') {
        if (systemAction === 'DROP') {
          matrix[0][0]++; // BOTH_DROP
          systemDrop++;
          judgeFail++;
        } else {
          matrix[0][1]++; // EXPLORATORY_DELTA
          systemKeep++;
          judgeFail++;
        }
      } else {
        // judgeVerdict === 'PASS'
        if (systemAction === 'DROP') {
          matrix[1][0]++; // CONSERVATIVE_DROP
          systemDrop++;
          judgePass++;
        } else {
          matrix[1][1]++; // BOTH_KEEP
          systemKeep++;
          judgePass++;
        }
      }
    }

    return {
      label: 'Judge (rows) vs System Action (cols)',
      matrix: matrix as [[number, number], [number, number]],
      totals: {
        systemDrop,
        systemKeep,
        judgeFail,
        judgePass,
      },
    };
  }

  /**
   * Calculate overall agreement rate.
   *
   * Formula: (BOTH_DROP + BOTH_KEEP) / Total
   *
   * This measures how often the system and judge agree.
   */
  private calculateOverallAgreementRate(
    confusionMatrix: ConfusionMatrix,
  ): EvaluationMetrics['overallAgreementRate'] {
    const bothDrop = confusionMatrix.matrix[0][0];
    const bothKeep = confusionMatrix.matrix[1][1];
    const total =
      bothDrop +
      bothKeep +
      confusionMatrix.matrix[0][1] +
      confusionMatrix.matrix[1][0];

    return {
      value: total > 0 ? DecimalHelper.divide(bothDrop + bothKeep, total) : 0,
      numerator: bothDrop + bothKeep,
      denominator: total,
      description:
        'Total matches / Total samples (BOTH_DROP + BOTH_KEEP) / Total',
    };
  }

  /**
   * Calculate noise removal efficiency.
   *
   * Formula: BOTH_DROP / System_DROP
   *
   * This measures: When system drops a course, how often does judge agree?
   * High value = system is good at filtering noise
   * Low value = system is over-filtering (dropping useful courses)
   */
  private calculateNoiseRemovalEfficiency(
    confusionMatrix: ConfusionMatrix,
  ): EvaluationMetrics['noiseRemovalEfficiency'] {
    const bothDrop = confusionMatrix.matrix[0][0];
    const systemDrop = confusionMatrix.totals.systemDrop;

    return {
      value: systemDrop > 0 ? DecimalHelper.divide(bothDrop, systemDrop) : 0,
      numerator: bothDrop,
      denominator: systemDrop,
      description:
        'When System=DROP, Judge also FAIL (both agree course is noise)',
    };
  }

  /**
   * Calculate exploratory recall.
   *
   * Formula: EXPLORATORY_DELTA / System_KEEP
   *
   * This measures: When system keeps a course, how often does judge disagree?
   * This is the "exploratory delta" - system's exploratory behavior
   * High value = system is more exploratory (might keep tangential courses)
   * Low value = system is more conservative
   */
  private calculateExploratoryRecall(
    confusionMatrix: ConfusionMatrix,
  ): EvaluationMetrics['exploratoryRecall'] {
    const exploratoryDelta = confusionMatrix.matrix[0][1];
    const systemKeep = confusionMatrix.totals.systemKeep;

    return {
      value:
        systemKeep > 0 ? DecimalHelper.divide(exploratoryDelta, systemKeep) : 0,
      numerator: exploratoryDelta,
      denominator: systemKeep,
      description:
        'System=KEEP but Judge=FAIL (system keeps courses judge would drop)',
    };
  }

  /**
   * Calculate conservative drop rate.
   *
   * Formula: CONSERVATIVE_DROP / System_DROP
   *
   * This measures: When system drops a course, how often does judge disagree?
   * This is the "conservative drop" - system's over-filtering behavior
   * High value = system is too strict (dropping useful courses)
   * Low value = system's filtering is well-aligned with judge
   */
  private calculateConservativeDropRate(
    confusionMatrix: ConfusionMatrix,
  ): EvaluationMetrics['conservativeDropRate'] {
    const conservativeDrop = confusionMatrix.matrix[1][0];
    const systemDrop = confusionMatrix.totals.systemDrop;

    return {
      value:
        systemDrop > 0 ? DecimalHelper.divide(conservativeDrop, systemDrop) : 0,
      numerator: conservativeDrop,
      denominator: systemDrop,
      description:
        'System=DROP but Judge=PASS (system drops courses judge would keep)',
    };
  }

  /**
   * Calculate score distribution across all courses.
   *
   * Counts how many courses received each system score (0, 1, 2, 3).
   */
  private calculateScoreDistribution(
    courses: CourseComparisonRecord[],
  ): ScoreDistribution {
    const distribution = {
      score0: 0,
      score1: 0,
      score2: 0,
      score3: 0,
    };

    for (const course of courses) {
      const score = course.system.score;
      switch (score) {
        case 0:
          distribution.score0++;
          break;
        case 1:
          distribution.score1++;
          break;
        case 2:
          distribution.score2++;
          break;
        case 3:
          distribution.score3++;
          break;
      }
    }

    return distribution;
  }

  /**
   * Calculate score × verdict breakdown.
   *
   * Cross-tabulation showing how well system scores predict judge verdicts.
   * For each score level (0-3), count how many courses passed/failed by judge.
   *
   * This reveals score calibration: higher scores should have higher pass rates.
   */
  private calculateScoreVerdictBreakdown(
    courses: CourseComparisonRecord[],
  ): ScoreVerdictBreakdown {
    // Initialize counters for each score
    const breakdown = {
      score0: { judgePass: 0, judgeFail: 0, total: 0, passRate: 0 },
      score1: { judgePass: 0, judgeFail: 0, total: 0, passRate: 0 },
      score2: { judgePass: 0, judgeFail: 0, total: 0, passRate: 0 },
      score3: { judgePass: 0, judgeFail: 0, total: 0, passRate: 0 },
    };

    // Count by score and verdict
    for (const course of courses) {
      const score = course.system.score;
      const verdict = course.judge.verdict;

      const entry = breakdown[`score${score}`];
      entry.total++;
      if (verdict === 'PASS') {
        entry.judgePass++;
      } else {
        entry.judgeFail++;
      }
    }

    // Calculate pass rates
    for (const score of ['score0', 'score1', 'score2', 'score3'] as const) {
      const entry = breakdown[score];
      entry.passRate =
        entry.total > 0
          ? DecimalHelper.divide(entry.judgePass, entry.total)
          : 0;
    }

    return breakdown;
  }

  /**
   * Calculate per-sample metrics.
   *
   * For each question/sample, compute individual metrics.
   * Allows drilling down to identify which specific questions perform poorly.
   */
  private calculatePerSampleMetrics(
    records: SampleEvaluationRecord[],
  ): PerSampleMetrics {
    return records.map((record, index) => {
      const courses = record.courses;
      const totalCourses = courses.length;

      // Count agreements and disagreements
      let agreementCount = 0;
      let disagreementCount = 0;
      let bothDrop = 0;
      let exploratoryDelta = 0;
      let conservativeDrop = 0;
      let systemDrop = 0;
      let systemKeep = 0;

      for (const course of courses) {
        const systemAction = course.system.action;
        const judgeVerdict = course.judge.verdict;

        if (judgeVerdict === 'FAIL') {
          if (systemAction === 'DROP') {
            bothDrop++;
            systemDrop++;
            agreementCount++;
          } else {
            exploratoryDelta++;
            systemKeep++;
            disagreementCount++;
          }
        } else {
          // judgeVerdict === 'PASS'
          if (systemAction === 'DROP') {
            conservativeDrop++;
            systemDrop++;
            disagreementCount++;
          } else {
            systemKeep++;
            agreementCount++;
          }
        }
      }

      // Calculate metrics for this sample
      const agreementRate =
        totalCourses > 0
          ? DecimalHelper.divide(agreementCount, totalCourses)
          : 0;
      const noiseRemovalEfficiency =
        systemDrop > 0 ? DecimalHelper.divide(bothDrop, systemDrop) : 0;
      const exploratoryRecall =
        systemKeep > 0 ? DecimalHelper.divide(exploratoryDelta, systemKeep) : 0;
      const conservativeDropRate =
        systemDrop > 0 ? DecimalHelper.divide(conservativeDrop, systemDrop) : 0;

      return {
        sampleId: index + 1,
        queryLogId: record.queryLogId,
        question: record.question,
        coursesEvaluated: totalCourses,
        agreementCount,
        disagreementCount,
        agreementRate,
        noiseRemovalEfficiency,
        exploratoryRecall,
        conservativeDropRate,
      };
    });
  }

  /**
   * Calculate threshold sweep.
   *
   * Simulates different keep/drop thresholds to find optimal balance.
   * Answers: "What if we only keep courses with score ≥ X?"
   */
  private calculateThresholdSweep(
    courses: CourseComparisonRecord[],
  ): ThresholdSweep {
    const sweep: ThresholdSweep = [];

    // Test thresholds: 0 (keep all), 1, 2, 3
    const thresholds: Array<{ threshold: string; minScore: number }> = [
      { threshold: 'keepAll', minScore: 0 },
      { threshold: '≥1', minScore: 1 },
      { threshold: '≥2', minScore: 2 },
      { threshold: '≥3', minScore: 3 },
    ];

    for (const { threshold, minScore } of thresholds) {
      let truePositives = 0; // System KEEP ∧ Judge PASS
      let falsePositives = 0; // System KEEP ∧ Judge FAIL
      let trueNegatives = 0; // System DROP ∧ Judge FAIL
      let falseNegatives = 0; // System DROP ∧ Judge PASS
      let coursesKept = 0;
      let coursesDropped = 0;

      for (const course of courses) {
        const systemScore = course.system.score;
        const judgeVerdict = course.judge.verdict;

        // Simulate system action based on threshold
        const simulatedSystemAction = systemScore >= minScore ? 'KEEP' : 'DROP';

        if (simulatedSystemAction === 'KEEP') {
          coursesKept++;
          if (judgeVerdict === 'PASS') {
            truePositives++;
          } else {
            falsePositives++;
          }
        } else {
          // DROP
          coursesDropped++;
          if (judgeVerdict === 'FAIL') {
            trueNegatives++;
          } else {
            falseNegatives++;
          }
        }
      }

      // Calculate precision and recall
      const precision =
        coursesKept > 0 ? DecimalHelper.divide(truePositives, coursesKept) : 0;
      const recall =
        truePositives + falseNegatives > 0
          ? DecimalHelper.divide(truePositives, truePositives + falseNegatives)
          : 0;

      // Generate description based on tradeoff
      const description = this.generateThresholdDescription(
        threshold,
        precision,
        recall,
      );

      sweep.push({
        threshold,
        minScore,
        coursesKept,
        coursesDropped,
        truePositives,
        falsePositives,
        trueNegatives,
        falseNegatives,
        precision,
        recall,
        description,
      });
    }

    return sweep;
  }

  /**
   * Generate human-readable description for a threshold level.
   *
   * Explains the tradeoff in the context of an exploratory search system.
   */
  private generateThresholdDescription(
    threshold: string,
    precision: number,
    recall: number,
  ): string {
    const precisionPct = Math.round(precision * 100);
    const recallPct = Math.round(recall * 100);

    switch (threshold) {
      case 'keepAll':
        return `Maximum exploration (keep all courses). High breadth, low signal-to-noise (${precisionPct}% of kept courses align with judge). Useful for comprehensive discovery but requires strong synthesis to contextualize results.`;

      case '≥1':
        return `Current production setting. Balanced exploration with ${precisionPct}% precision, ${recallPct}% recall. Keeps scores 1-3 (weak to strong matches), providing broad context for synthesis. Suitable for exploratory search where breadth is valued over precision.`;

      case '≥2':
        return `Conservative filtering (medium+ relevance only). ${precisionPct}% precision, ${recallPct}% recall. Higher quality results but misses ${100 - recallPct}% of judge-approved courses. Better for focused recommendations when users want direct relevance over exploratory breadth.`;

      case '≥3':
        return `Strict filtering (strong matches only). ${precisionPct}% precision, ${recallPct}% recall. Highest quality but misses most (${100 - recallPct}%) of relevant courses. Use only when users want highly targeted results and minimal exploration.`;

      default:
        return `Threshold ${threshold}: ${precisionPct}% precision, ${recallPct}% recall.`;
    }
  }

  /**
   * Create empty metrics (for edge case of no courses).
   */
  private createEmptyMetrics(): EvaluationMetrics {
    const emptyMatrix: ConfusionMatrix = {
      label: 'Judge (rows) vs System Action (cols)',
      matrix: [
        [0, 0],
        [0, 0],
      ],
      totals: {
        systemDrop: 0,
        systemKeep: 0,
        judgeFail: 0,
        judgePass: 0,
      },
    };

    const emptyDistribution: ScoreDistribution = {
      score0: 0,
      score1: 0,
      score2: 0,
      score3: 0,
    };

    const emptyScoreVerdictBreakdown: ScoreVerdictBreakdown = {
      score0: { judgePass: 0, judgeFail: 0, total: 0, passRate: 0 },
      score1: { judgePass: 0, judgeFail: 0, total: 0, passRate: 0 },
      score2: { judgePass: 0, judgeFail: 0, total: 0, passRate: 0 },
      score3: { judgePass: 0, judgeFail: 0, total: 0, passRate: 0 },
    };

    const emptyThresholdSweep: ThresholdSweep = [];

    return {
      sampleCount: 0,
      totalCoursesEvaluated: 0,
      overallAgreementRate: {
        value: 0,
        numerator: 0,
        denominator: 0,
        description: 'Total matches / Total samples',
      },
      noiseRemovalEfficiency: {
        value: 0,
        numerator: 0,
        denominator: 0,
        description: 'When System=DROP, Judge also FAIL',
      },
      exploratoryRecall: {
        value: 0,
        numerator: 0,
        denominator: 0,
        description: 'System=KEEP but Judge=FAIL',
      },
      conservativeDropRate: {
        value: 0,
        numerator: 0,
        denominator: 0,
        description: 'System=DROP but Judge=PASS',
      },
      systemScoreDistribution: emptyDistribution,
      confusionMatrix: emptyMatrix,
      // New diagnostic metrics (empty versions)
      scoreVerdictBreakdown: emptyScoreVerdictBreakdown,
      perSampleMetrics: [],
      thresholdSweep: emptyThresholdSweep,
    };
  }
}
