import { Injectable, Logger } from '@nestjs/common';

import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import type {
  ConfusionMatrix,
  CourseComparisonRecord,
  EvaluationMetrics,
  SampleEvaluationRecord,
  ScoreDistribution,
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
    };
  }
}
