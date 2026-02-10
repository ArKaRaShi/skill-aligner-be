import { Injectable, Logger } from '@nestjs/common';

import type {
  AnswerSynthesisComparisonRecord,
  AnswerSynthesisLowFaithfulnessFile,
} from '../types/answer-synthesis.types';

// ============================================================================
// ANSWER SYNTHESIS LOW FAITHFULNESS ANALYZER SERVICE
// ============================================================================

/**
 * Analyzes low-quality answer patterns from comparison records.
 *
 * Identifies patterns in failed evaluations to provide actionable insights
 * for prompt tuning and system improvement.
 *
 * Covers TWO dimensions:
 * - FAITHFULNESS failures (hallucinations, contradicts context)
 * - COMPLETENESS failures (poor explanation, doesn't connect dots)
 */
@Injectable()
export class AnswerSynthesisLowFaithfulnessAnalyzerService {
  private readonly logger = new Logger(
    AnswerSynthesisLowFaithfulnessAnalyzerService.name,
  );

  /**
   * Analyze low-quality patterns from comparison records.
   *
   * @param records - Comparison records
   * @returns Complete low-quality analysis
   */
  analyzeLowFaithfulness(
    records: AnswerSynthesisComparisonRecord[],
  ): AnswerSynthesisLowFaithfulnessFile {
    this.logger.log(
      `Analyzing low-quality patterns from ${records.length} samples`,
    );

    // Filter low-quality (failed) records
    const lowQualityRecords = records.filter((r) => !r.passed);
    const totalLowQuality = lowQualityRecords.length;
    const totalSamples = records.length;

    this.logger.log(
      `Found ${totalLowQuality} low-quality answers out of ${totalSamples} samples`,
    );

    if (totalLowQuality === 0) {
      return this.createEmptyLowFaithfulness(totalSamples);
    }

    // Analyze by failure reason (both dimensions)
    const byFaithfulnessReason =
      this.analyzeByFaithfulnessReason(lowQualityRecords);
    const byCompletenessReason =
      this.analyzeByCompletenessReason(lowQualityRecords);

    // Generate insights
    const insights = this.generateInsights(
      lowQualityRecords,
      totalSamples,
      byFaithfulnessReason,
      byCompletenessReason,
    );

    return {
      totalLowQuality,
      totalSamples,
      lowQualityRate: totalLowQuality / totalSamples,
      byFaithfulnessReason,
      byCompletenessReason,
      insights,
    };
  }

  /**
   * Analyze low-quality records by faithfulness score category.
   */
  private analyzeByFaithfulnessReason(
    records: AnswerSynthesisComparisonRecord[],
  ) {
    // Initialize categories based on faithfulness scores
    const completelyFalse = {
      count: 0,
      percentage: 0,
      description:
        'Score 1: Completely False (hallucinations or contradicts context)',
      examples: [] as Array<{
        queryLogId: string;
        question: string;
        overallScore: number;
        judgeReasoning: string;
      }>,
    };

    const mostlyFalse = {
      count: 0,
      percentage: 0,
      description: 'Score 2: Mostly False (major factual errors)',
      examples: [] as Array<{
        queryLogId: string;
        question: string;
        overallScore: number;
        judgeReasoning: string;
      }>,
    };

    const mixed = {
      count: 0,
      percentage: 0,
      description: 'Score 3: Mixed (some supported facts, some hallucinations)',
      examples: [] as Array<{
        queryLogId: string;
        question: string;
        overallScore: number;
        judgeReasoning: string;
      }>,
    };

    // Categorize each record by faithfulness score
    for (const record of records) {
      const faithfulnessScore = record.judgeVerdict.faithfulness.score;

      // Only categorize if faithfulness is the failure reason (score < 4)
      if (faithfulnessScore < 4) {
        const example = {
          queryLogId: record.queryLogId,
          question: record.question,
          overallScore: record.overallScore,
          judgeReasoning: record.judgeVerdict.faithfulness.reasoning,
        };

        if (faithfulnessScore === 1) {
          completelyFalse.count++;
          if (completelyFalse.examples.length < 3) {
            completelyFalse.examples.push(example);
          }
        } else if (faithfulnessScore === 2) {
          mostlyFalse.count++;
          if (mostlyFalse.examples.length < 3) {
            mostlyFalse.examples.push(example);
          }
        } else if (faithfulnessScore === 3) {
          mixed.count++;
          if (mixed.examples.length < 3) {
            mixed.examples.push(example);
          }
        }
      }
    }

    // Calculate percentages (of failed records)
    const total = records.length;
    completelyFalse.percentage = total > 0 ? completelyFalse.count / total : 0;
    mostlyFalse.percentage = total > 0 ? mostlyFalse.count / total : 0;
    mixed.percentage = total > 0 ? mixed.count / total : 0;

    return {
      completelyFalse,
      mostlyFalse,
      mixed,
    };
  }

  /**
   * Analyze low-quality records by completeness score category.
   */
  private analyzeByCompletenessReason(
    records: AnswerSynthesisComparisonRecord[],
  ) {
    // Initialize categories based on completeness scores
    const fail = {
      count: 0,
      percentage: 0,
      description:
        'Score 1: Fail (just lists codes, or says none found when valid options exist)',
      examples: [] as Array<{
        queryLogId: string;
        question: string;
        overallScore: number;
        judgeReasoning: string;
      }>,
    };

    const weak = {
      count: 0,
      percentage: 0,
      description: 'Score 2: Weak (very little context or explanation)',
      examples: [] as Array<{
        queryLogId: string;
        question: string;
        overallScore: number;
        judgeReasoning: string;
      }>,
    };

    const descriptiveOnly = {
      count: 0,
      percentage: 0,
      description:
        "Score 3: Descriptive Only (lists facts, doesn't explain value to user)",
      examples: [] as Array<{
        queryLogId: string;
        question: string;
        overallScore: number;
        judgeReasoning: string;
      }>,
    };

    // Categorize each record by completeness score
    for (const record of records) {
      const completenessScore = record.judgeVerdict.completeness.score;

      // Only categorize if completeness is the failure reason (score < 4)
      if (completenessScore < 4) {
        const example = {
          queryLogId: record.queryLogId,
          question: record.question,
          overallScore: record.overallScore,
          judgeReasoning: record.judgeVerdict.completeness.reasoning,
        };

        if (completenessScore === 1) {
          fail.count++;
          if (fail.examples.length < 3) {
            fail.examples.push(example);
          }
        } else if (completenessScore === 2) {
          weak.count++;
          if (weak.examples.length < 3) {
            weak.examples.push(example);
          }
        } else if (completenessScore === 3) {
          descriptiveOnly.count++;
          if (descriptiveOnly.examples.length < 3) {
            descriptiveOnly.examples.push(example);
          }
        }
      }
    }

    // Calculate percentages (of failed records)
    const total = records.length;
    fail.percentage = total > 0 ? fail.count / total : 0;
    weak.percentage = total > 0 ? weak.count / total : 0;
    descriptiveOnly.percentage = total > 0 ? descriptiveOnly.count / total : 0;

    return {
      fail,
      weak,
      descriptiveOnly,
    };
  }

  /**
   * Generate insights from low-quality patterns.
   */
  private generateInsights(
    lowQualityRecords: AnswerSynthesisComparisonRecord[],
    totalSamples: number,
    byFaithfulnessReason: {
      completelyFalse: { count: number };
      mostlyFalse: { count: number };
      mixed: { count: number };
    },
    byCompletenessReason: {
      fail: { count: number };
      weak: { count: number };
      descriptiveOnly: { count: number };
    },
  ): AnswerSynthesisLowFaithfulnessFile['insights'] {
    // Count specific issues
    const completelyFalseCount = byFaithfulnessReason.completelyFalse.count;
    const mostlyFalseCount = byFaithfulnessReason.mostlyFalse.count;
    const mixedCount = byFaithfulnessReason.mixed.count;
    const completenessFailCount = byCompletenessReason.fail.count;
    const weakCount = byCompletenessReason.weak.count;
    const descriptiveOnlyCount = byCompletenessReason.descriptiveOnly.count;

    // Generate system strength
    const strengthParts: string[] = [];
    const passRate = (totalSamples - lowQualityRecords.length) / totalSamples;
    if (passRate > 0.8) {
      strengthParts.push('High overall pass rate');
    }
    if (completelyFalseCount === 0) {
      strengthParts.push('No complete hallucinations');
    }
    if (mostlyFalseCount === 0) {
      strengthParts.push('No major factual errors');
    }
    if (mixedCount < lowQualityRecords.length * 0.3) {
      strengthParts.push('Mostly faithful to context');
    }
    if (completenessFailCount === 0) {
      strengthParts.push('All answers provide some explanation');
    }
    if (weakCount === 0 && descriptiveOnlyCount === 0) {
      strengthParts.push('Good explanatory bridging');
    }

    const systemStrength =
      strengthParts.length > 0
        ? strengthParts.join('; ')
        : 'No significant strengths identified';

    // Generate system weakness
    const weaknessParts: string[] = [];

    // Faithfulness weaknesses
    if (completelyFalseCount > lowQualityRecords.length * 0.3) {
      weaknessParts.push(
        'Frequently generates complete hallucinations or contradicts context',
      );
    }
    if (mostlyFalseCount > lowQualityRecords.length * 0.5) {
      weaknessParts.push('Often contains major factual errors');
    }
    if (mixedCount > lowQualityRecords.length * 0.5) {
      weaknessParts.push(
        'Frequently mixes supported facts with hallucinations',
      );
    }

    // Completeness weaknesses
    if (completenessFailCount > lowQualityRecords.length * 0.3) {
      weaknessParts.push(
        'Often fails to explain course value (just lists codes)',
      );
    }
    if (weakCount > lowQualityRecords.length * 0.5) {
      weaknessParts.push('Provides very little context or explanation');
    }
    if (descriptiveOnlyCount > lowQualityRecords.length * 0.5) {
      weaknessParts.push(
        'Lists facts but fails to explain why courses matter to user',
      );
    }

    const systemWeakness =
      weaknessParts.length > 0
        ? weaknessParts.join('; ')
        : 'No clear weakness pattern identified';

    // Generate recommendation
    let recommendation = '';

    // Faithfulness recommendations
    if (completelyFalseCount > 0 || mostlyFalseCount > 0) {
      recommendation +=
        'Address hallucinations by emphasizing context-only answers in prompt. ';
    }
    if (mixedCount > 0) {
      recommendation +=
        'Reduce partial hallucinations by requiring all claims to be context-supported. ';
    }

    // Completeness recommendations
    if (completenessFailCount > 0 || weakCount > 0) {
      recommendation +=
        'Improve explanatory quality by requiring answers to connect courses to user goals. ';
    }
    if (descriptiveOnlyCount > 0) {
      recommendation +=
        'Add "why this matters" explanations to move beyond fact-listing. ';
    }

    if (!recommendation) {
      recommendation =
        'System performs well. Continue monitoring for edge cases.';
    }

    return {
      systemStrength,
      systemWeakness,
      recommendation: recommendation.trim(),
    };
  }

  /**
   * Create empty low-faithfulness file (when all answers passed).
   */
  private createEmptyLowFaithfulness(
    totalSamples: number,
  ): AnswerSynthesisLowFaithfulnessFile {
    return {
      totalLowQuality: 0,
      totalSamples,
      lowQualityRate: 0,
      byFaithfulnessReason: {
        completelyFalse: {
          count: 0,
          percentage: 0,
          description: 'Score 1: Completely False (hallucinations)',
          examples: [],
        },
        mostlyFalse: {
          count: 0,
          percentage: 0,
          description: 'Score 2: Mostly False (major errors)',
          examples: [],
        },
        mixed: {
          count: 0,
          percentage: 0,
          description: 'Score 3: Mixed (some supported, some not)',
          examples: [],
        },
      },
      byCompletenessReason: {
        fail: {
          count: 0,
          percentage: 0,
          description: 'Score 1: Fail (just lists codes)',
          examples: [],
        },
        weak: {
          count: 0,
          percentage: 0,
          description: 'Score 2: Weak (very little explanation)',
          examples: [],
        },
        descriptiveOnly: {
          count: 0,
          percentage: 0,
          description: 'Score 3: Descriptive Only (lists facts)',
          examples: [],
        },
      },
      insights: {
        systemStrength: 'All answers passed evaluation',
        systemWeakness: 'No weaknesses identified',
        recommendation: 'Continue monitoring for edge cases',
      },
    };
  }
}
