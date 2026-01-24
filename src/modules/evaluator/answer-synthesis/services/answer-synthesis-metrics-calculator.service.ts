import { Injectable, Logger } from '@nestjs/common';

import { DecimalHelper } from 'src/shared/utils/decimal.helper';

import type {
  AnswerSynthesisComparisonRecord,
  AnswerSynthesisMetrics,
  Score1to5Distribution,
} from '../types/answer-synthesis.types';

// ============================================================================
// ANSWER SYNTHESIS METRICS CALCULATOR SERVICE
// ============================================================================

/**
 * Calculates evaluation metrics from comparison records.
 *
 * Transforms raw comparison records into structured metrics including:
 * - Faithfulness metrics (1-5 scale)
 * - Completeness metrics (1-5 scale)
 * - Overall pass rate (BOTH dimensions ≥ 4)
 * - Score distributions
 * - Average course count (context size)
 */
@Injectable()
export class AnswerSynthesisMetricsCalculator {
  private readonly logger = new Logger(AnswerSynthesisMetricsCalculator.name);

  /**
   * Calculate all metrics from comparison records.
   *
   * @param records - Comparison records (with system + judge comparisons)
   * @returns Complete evaluation metrics
   */
  calculateFromRecords(
    records: AnswerSynthesisComparisonRecord[],
  ): AnswerSynthesisMetrics {
    this.logger.log(`Calculating metrics from ${records.length} samples`);

    if (records.length === 0) {
      this.logger.warn('No records to calculate metrics from');
      return this.createEmptyMetrics();
    }

    // Calculate faithfulness metrics
    const averageFaithfulnessScore =
      this.calculateAverageFaithfulnessScore(records);
    const faithfulnessPassRate = this.calculateFaithfulnessPassRate(records);
    const faithfulnessDistribution =
      this.calculateFaithfulnessDistribution(records);

    // Calculate completeness metrics
    const averageCompletenessScore =
      this.calculateAverageCompletenessScore(records);
    const completenessPassRate = this.calculateCompletenessPassRate(records);
    const completenessDistribution =
      this.calculateCompletenessDistribution(records);

    // Calculate overall pass rate (BOTH dimensions ≥ 4)
    const overallPassRate = this.calculateOverallPassRate(records);

    // Calculate average course count
    const averageCourseCount = this.calculateAverageCourseCount(records);

    return {
      sampleCount: records.length,
      averageFaithfulnessScore,
      faithfulnessPassRate,
      faithfulnessDistribution,
      averageCompletenessScore,
      completenessPassRate,
      completenessDistribution,
      overallPassRate,
      averageCourseCount,
    };
  }

  /**
   * Calculate average faithfulness score (1-5 scale).
   */
  private calculateAverageFaithfulnessScore(
    records: AnswerSynthesisComparisonRecord[],
  ) {
    const totalScore = records.reduce(
      (sum, record) => sum + record.judgeVerdict.faithfulness.score,
      0,
    );

    return {
      value: DecimalHelper.divide(totalScore, records.length),
      numerator: totalScore,
      denominator: records.length,
      description: 'Average faithfulness score (1-5 scale)',
    };
  }

  /**
   * Calculate faithfulness pass rate (score ≥ 4).
   */
  private calculateFaithfulnessPassRate(
    records: AnswerSynthesisComparisonRecord[],
  ) {
    const passedCount = records.filter(
      (record) => record.judgeVerdict.faithfulness.score >= 4,
    ).length;

    return {
      value: DecimalHelper.divide(passedCount, records.length),
      numerator: passedCount,
      denominator: records.length,
      description: 'Faithfulness pass rate (score ≥ 4)',
    };
  }

  /**
   * Calculate faithfulness score distribution (1-5).
   */
  private calculateFaithfulnessDistribution(
    records: AnswerSynthesisComparisonRecord[],
  ): Score1to5Distribution {
    const distribution: Score1to5Distribution = {
      score1: 0,
      score2: 0,
      score3: 0,
      score4: 0,
      score5: 0,
    };

    for (const record of records) {
      const score = record.judgeVerdict.faithfulness.score;
      distribution[`score${score}`]++;
    }

    return distribution;
  }

  /**
   * Calculate average completeness score (1-5 scale).
   */
  private calculateAverageCompletenessScore(
    records: AnswerSynthesisComparisonRecord[],
  ) {
    const totalScore = records.reduce(
      (sum, record) => sum + record.judgeVerdict.completeness.score,
      0,
    );

    return {
      value: DecimalHelper.divide(totalScore, records.length),
      numerator: totalScore,
      denominator: records.length,
      description: 'Average completeness score (1-5 scale)',
    };
  }

  /**
   * Calculate completeness pass rate (score ≥ 4).
   */
  private calculateCompletenessPassRate(
    records: AnswerSynthesisComparisonRecord[],
  ) {
    const passedCount = records.filter(
      (record) => record.judgeVerdict.completeness.score >= 4,
    ).length;

    return {
      value: DecimalHelper.divide(passedCount, records.length),
      numerator: passedCount,
      denominator: records.length,
      description: 'Completeness pass rate (score ≥ 4)',
    };
  }

  /**
   * Calculate completeness score distribution (1-5).
   */
  private calculateCompletenessDistribution(
    records: AnswerSynthesisComparisonRecord[],
  ): Score1to5Distribution {
    const distribution: Score1to5Distribution = {
      score1: 0,
      score2: 0,
      score3: 0,
      score4: 0,
      score5: 0,
    };

    for (const record of records) {
      const score = record.judgeVerdict.completeness.score;
      distribution[`score${score}`]++;
    }

    return distribution;
  }

  /**
   * Calculate overall pass rate (BOTH dimensions ≥ 4).
   */
  private calculateOverallPassRate(records: AnswerSynthesisComparisonRecord[]) {
    const passedCount = records.filter((record) => record.passed).length;

    return {
      value: DecimalHelper.divide(passedCount, records.length),
      numerator: passedCount,
      denominator: records.length,
      description: 'Overall pass rate (BOTH dimensions ≥ 4)',
    };
  }

  /**
   * Calculate average course count per sample.
   */
  private calculateAverageCourseCount(
    records: AnswerSynthesisComparisonRecord[],
  ) {
    const totalCourses = records.reduce(
      (sum, record) => sum + record.courseCount,
      0,
    );

    return {
      value: DecimalHelper.divide(totalCourses, records.length),
      numerator: totalCourses,
      denominator: records.length,
      description: 'Average number of courses per question',
    };
  }

  /**
   * Create empty metrics (for edge case of no records).
   */
  private createEmptyMetrics(): AnswerSynthesisMetrics {
    const emptyFraction = {
      value: 0,
      numerator: 0,
      denominator: 0,
      description: 'No data',
    };

    const emptyDistribution: Score1to5Distribution = {
      score1: 0,
      score2: 0,
      score3: 0,
      score4: 0,
      score5: 0,
    };

    return {
      sampleCount: 0,
      averageFaithfulnessScore: {
        ...emptyFraction,
        description: 'Average faithfulness score (1-5 scale)',
      },
      faithfulnessPassRate: {
        ...emptyFraction,
        description: 'Faithfulness pass rate (score ≥ 4)',
      },
      faithfulnessDistribution: { ...emptyDistribution },
      averageCompletenessScore: {
        ...emptyFraction,
        description: 'Average completeness score (1-5 scale)',
      },
      completenessPassRate: {
        ...emptyFraction,
        description: 'Completeness pass rate (score ≥ 4)',
      },
      completenessDistribution: { ...emptyDistribution },
      overallPassRate: {
        ...emptyFraction,
        description: 'Overall pass rate (BOTH dimensions ≥ 4)',
      },
      averageCourseCount: {
        ...emptyFraction,
        description: 'Average number of courses per question',
      },
    };
  }
}
