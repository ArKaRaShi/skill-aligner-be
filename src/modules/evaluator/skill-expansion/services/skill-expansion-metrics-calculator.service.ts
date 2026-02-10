import { Injectable, Logger } from '@nestjs/common';

import { DecimalHelper } from '../../../../shared/utils/decimal.helper';
import type {
  SampleEvaluationRecord,
  SkillComparisonRecord,
  SkillExpansionMetrics,
} from '../types/skill-expansion.types';

// ============================================================================
// SKILL EXPANSION METRICS CALCULATOR SERVICE
// ============================================================================

/**
 * Calculates evaluation metrics from skill comparison records.
 *
 * Simplified to match new judge output format (PASS/FAIL only):
 * - Pass rate (skills with PASS verdict)
 * - Concept preservation rate (questions preserving user concepts)
 * - Overall agreement rate (same as pass rate)
 * - Skill count distribution (per question)
 * - Confusion matrix (TP/FP only, since system always keeps)
 */
@Injectable()
export class SkillExpansionMetricsCalculator {
  private readonly logger = new Logger(SkillExpansionMetricsCalculator.name);

  /**
   * Calculate all metrics from sample records.
   *
   * @param records - Sample evaluation records (with system + judge comparisons)
   * @returns Complete evaluation metrics
   */
  calculateFromRecords(
    records: SampleEvaluationRecord[],
  ): SkillExpansionMetrics {
    this.logger.log(`Calculating metrics from ${records.length} samples`);

    // Flatten all skill comparisons
    const allSkills: SkillComparisonRecord[] = records.flatMap(
      (record) => record.comparison.skills,
    );

    if (allSkills.length === 0) {
      this.logger.warn('No skills to calculate metrics from');
      return this.createEmptyMetrics();
    }

    // Calculate primary metrics
    const totalSkills = allSkills.length;
    const totalQuestions = records.length;

    // Pass rate: skills with PASS verdict
    const passedSkills = allSkills.filter(
      (s) => s.judgeVerdict === 'PASS',
    ).length;
    const passRate = DecimalHelper.divide(passedSkills, totalSkills);

    // Concept preservation
    const conceptPreservedQuestions = records.filter(
      (r) => r.comparison.overall.conceptPreserved,
    ).length;
    const conceptPreservationRate = DecimalHelper.divide(
      conceptPreservedQuestions,
      totalQuestions,
    );

    // Agreement: Since system always keeps, agreement = judge PASS
    const agreedSkills = passedSkills;
    const overallAgreementRate = passRate;

    // Skill count distribution
    const skillCountDistribution =
      this.calculateSkillCountDistribution(records);

    // Confusion matrix (system always keeps)
    const confusionMatrix = this.calculateConfusionMatrix(allSkills);

    return {
      totalSkills,
      passedSkills,
      passRate,
      totalQuestions,
      conceptPreservedQuestions,
      conceptPreservationRate,
      agreedSkills,
      totalEvaluatedSkills: totalSkills,
      overallAgreementRate,
      skillCountDistribution,
      truePositives: confusionMatrix.truePositives,
      falsePositives: confusionMatrix.falsePositives,
    };
  }

  /**
   * Calculate skill count distribution per question.
   *
   * @param records - Sample evaluation records
   * @returns Distribution map with counts for each skill count
   */
  private calculateSkillCountDistribution(
    records: SampleEvaluationRecord[],
  ): Record<number, number> {
    const distribution: Record<number, number> = {};

    for (const record of records) {
      const skillCount = record.comparison.skills.length;
      distribution[skillCount] = (distribution[skillCount] || 0) + 1;
    }

    return distribution;
  }

  /**
   * Calculate confusion matrix for skill expansion.
   *
   * Since system always keeps skills:
   * - True Positive: System KEEP, Judge PASS (good skill kept)
   * - False Positive: System KEEP, Judge FAIL (bad skill kept)
   * - True Negative: System DROP, Judge FAIL (N/A - system never drops)
   * - False Negative: System DROP, Judge PASS (N/A - system never drops)
   *
   * @param skills - Skill comparison records
   * @returns Confusion matrix counts
   */
  private calculateConfusionMatrix(skills: SkillComparisonRecord[]): {
    truePositives: number;
    falsePositives: number;
  } {
    let truePositives = 0;
    let falsePositives = 0;

    for (const skill of skills) {
      if (skill.judgeVerdict === 'PASS') {
        truePositives++;
      } else {
        falsePositives++;
      }
    }

    return {
      truePositives,
      falsePositives,
    };
  }

  /**
   * Create empty metrics (for edge case of no skills).
   */
  private createEmptyMetrics(): SkillExpansionMetrics {
    return {
      totalSkills: 0,
      passedSkills: 0,
      passRate: 0,
      totalQuestions: 0,
      conceptPreservedQuestions: 0,
      conceptPreservationRate: 0,
      agreedSkills: 0,
      totalEvaluatedSkills: 0,
      overallAgreementRate: 0,
      skillCountDistribution: {},
      truePositives: 0,
      falsePositives: 0,
    };
  }
}
