import { Injectable, Logger } from '@nestjs/common';

import type {
  CourseComparisonRecord,
  DisagreementByType,
  DisagreementPattern,
  DisagreementsFile,
  ExploratoryDeltaCategory,
  ExploratoryDeltaFile,
  SampleEvaluationRecord,
} from '../types/course-relevance-filter.types';

// ============================================================================
// DISAGREEMENT ANALYZER SERVICE
// ============================================================================

/**
 * Analyzes disagreement patterns between system and judge.
 *
 * Identifies patterns in EXPLORATORY_DELTA and CONSERVATIVE_DROP disagreements,
 * extracts examples, and generates actionable insights for prompt tuning.
 */
@Injectable()
export class DisagreementAnalyzerService {
  private readonly logger = new Logger(DisagreementAnalyzerService.name);

  /**
   * Analyze all disagreements from sample records.
   *
   * @param records - Sample evaluation records
   * @returns Complete disagreements analysis
   */
  analyzeDisagreements(records: SampleEvaluationRecord[]): DisagreementsFile {
    this.logger.log(`Analyzing disagreements from ${records.length} samples`);

    // Flatten all course comparisons
    const allCourses: CourseComparisonRecord[] = records.flatMap(
      (record) => record.courses,
    );

    // Filter disagreements
    const disagreements = allCourses.filter((c) => !c.agreement);
    const totalDisagreements = disagreements.length;
    const totalSamples = records.length;

    this.logger.log(
      `Found ${totalDisagreements} disagreements out of ${allCourses.length} courses`,
    );

    if (totalDisagreements === 0) {
      return this.createEmptyDisagreements(totalSamples);
    }

    // Analyze by type
    const byType = this.analyzeByType(disagreements);

    // Generate insights
    const insights = this.generateInsights(byType);

    return {
      totalDisagreements,
      totalSamples,
      disagreementRate: totalDisagreements / allCourses.length,
      byType,
      insights,
    };
  }

  /**
   * Analyze exploratory delta cases in detail.
   *
   * Categorizes EXPLORATORY_DELTA disagreements into patterns:
   * - FOUNDATIONAL_OVERKEEP: System keeps foundational/prerequisite courses
   * - SIBLING_MISCLASSIFICATION: System keeps sibling/adjacent topics
   * - CONTEXTUAL_OVERALIGNMENT: System keeps courses due to context over-alignment
   *
   * @param records - Sample evaluation records
   * @returns Exploratory delta analysis
   */
  analyzeExploratoryDelta(
    records: SampleEvaluationRecord[],
  ): ExploratoryDeltaFile {
    this.logger.log('Analyzing exploratory delta cases');

    // Flatten and filter exploratory deltas
    const allCourses: CourseComparisonRecord[] = records.flatMap(
      (record) => record.courses,
    );
    const exploratoryDeltas = allCourses.filter(
      (c) => c.agreementType === 'EXPLORATORY_DELTA',
    );

    this.logger.log(
      `Found ${exploratoryDeltas.length} exploratory delta cases`,
    );

    if (exploratoryDeltas.length === 0) {
      return this.createEmptyExploratoryDelta();
    }

    // Categorize cases
    const categories = this.categorizeExploratoryDeltas(exploratoryDeltas);

    // Generate insights
    const insights = this.generateExploratoryDeltaInsights(categories);

    return {
      description:
        'Analysis of EXPLORATORY_DELTA cases (System KEEP but Judge FAIL)',
      totalCases: exploratoryDeltas.length,
      categories,
      insights,
    };
  }

  /**
   * Analyze disagreements by type (EXPLORATORY_DELTA vs CONSERVATIVE_DROP).
   */
  private analyzeByType(
    disagreements: CourseComparisonRecord[],
  ): DisagreementByType {
    // Split by type
    const exploratoryDeltas = disagreements.filter(
      (d) => d.agreementType === 'EXPLORATORY_DELTA',
    );
    const conservativeDrops = disagreements.filter(
      (d) => d.agreementType === 'CONSERVATIVE_DROP',
    );

    return {
      EXPLORATORY_DELTA: this.analyzeExploratoryDeltas(exploratoryDeltas),
      CONSERVATIVE_DROP: this.analyzeConservativeDrops(conservativeDrops),
    };
  }

  /**
   * Analyze exploratory delta disagreements.
   */
  private analyzeExploratoryDeltas(
    cases: CourseComparisonRecord[],
  ): DisagreementByType['EXPLORATORY_DELTA'] {
    const total = cases.length;
    const totalCourses = cases.length; // Since these are already filtered

    // Count by system score
    const bySystemScore = {
      score1: cases.filter((c) => c.system.score === 1).length,
      score2: cases.filter((c) => c.system.score === 2).length,
      score3: cases.filter((c) => c.system.score === 3).length,
    };

    // Extract examples (up to 5)
    const examples = cases.slice(0, 5).map((c) => ({
      queryLogId: c.subjectCode, // Using subjectCode as proxy
      question: '', // Will be filled by caller if needed
      subjectCode: c.subjectCode,
      subjectName: c.subjectName,
      systemScore: c.system.score,
      systemReason: c.system.reason,
      judgeVerdict: c.judge.verdict,
      judgeReason: c.judge.reason,
    }));

    // Identify common patterns
    const commonPatterns = this.identifyExploratoryPatterns(cases);

    return {
      count: total,
      percentage: totalCourses > 0 ? total / totalCourses : 0,
      description:
        'System keeps courses that judge would drop (system is too exploratory)',
      bySystemScore,
      commonPatterns,
      examples,
    };
  }

  /**
   * Analyze conservative drop disagreements.
   */
  private analyzeConservativeDrops(
    cases: CourseComparisonRecord[],
  ): DisagreementByType['CONSERVATIVE_DROP'] {
    const total = cases.length;
    const totalCourses = cases.length;

    // Extract examples (up to 5)
    const examples = cases.slice(0, 5).map((c) => ({
      queryLogId: c.subjectCode,
      question: '',
      subjectCode: c.subjectCode,
      subjectName: c.subjectName,
      systemScore: c.system.score,
      systemReason: c.system.reason,
      judgeVerdict: c.judge.verdict,
      judgeReason: c.judge.reason,
    }));

    // Identify common patterns
    const commonPatterns = this.identifyConservativePatterns(cases);

    return {
      count: total,
      percentage: totalCourses > 0 ? total / totalCourses : 0,
      description:
        'System drops courses that judge would keep (system is too strict)',
      commonPatterns,
      examples,
    };
  }

  /**
   * Identify patterns in exploratory delta cases.
   */
  private identifyExploratoryPatterns(
    cases: CourseComparisonRecord[],
  ): DisagreementPattern[] {
    const patterns: DisagreementPattern[] = [];

    // Pattern 1: Foundational course overkeep
    const foundationalCases = cases.filter((c) =>
      this.isFoundationalOverkeep(c),
    );
    if (foundationalCases.length > 0) {
      patterns.push({
        pattern: 'FOUNDATIONAL_OVERKEEP',
        count: foundationalCases.length,
        description:
          'System keeps foundational/prerequisite courses that judge considers too basic',
        example: this.extractExample(foundationalCases),
      });
    }

    // Pattern 2: Sibling topic misclassification
    const siblingCases = cases.filter((c) =>
      this.isSiblingMisclassification(c),
    );
    if (siblingCases.length > 0) {
      patterns.push({
        pattern: 'SIBLING_MISCLASSIFICATION',
        count: siblingCases.length,
        description:
          'System keeps adjacent/sibling topics that judge considers distinct',
        example: this.extractExample(siblingCases),
      });
    }

    // Pattern 3: Contextual over-alignment
    const contextCases = cases.filter((c) => this.isContextualOveralignment(c));
    if (contextCases.length > 0) {
      patterns.push({
        pattern: 'CONTEXTUAL_OVERALIGNMENT',
        count: contextCases.length,
        description:
          'System keeps courses due to context keywords that judge considers tangential',
        example: this.extractExample(contextCases),
      });
    }

    return patterns;
  }

  /**
   * Identify patterns in conservative drop cases.
   */
  private identifyConservativePatterns(
    cases: CourseComparisonRecord[],
  ): DisagreementPattern[] {
    const patterns: DisagreementPattern[] = [];

    // Pattern 1: Enabling tool underdrop
    const enablingCases = cases.filter((c) => this.isEnablingToolUnderdrop(c));
    if (enablingCases.length > 0) {
      patterns.push({
        pattern: 'ENABLING_TOOL_UNDERDROP',
        count: enablingCases.length,
        description:
          'System drops enabling tools (e.g., Python for Biologist) that judge considers valuable',
        example: this.extractExample(enablingCases),
      });
    }

    // Pattern 2: Valid pivot rejection
    const pivotCases = cases.filter((c) => this.isValidPivotRejection(c));
    if (pivotCases.length > 0) {
      patterns.push({
        pattern: 'VALID_PIVOT_REJECTION',
        count: pivotCases.length,
        description:
          'System drops valid career pivots that judge considers logical',
        example: this.extractExample(pivotCases),
      });
    }

    return patterns;
  }

  /**
   * Categorize exploratory delta cases for detailed analysis.
   */
  private categorizeExploratoryDeltas(
    cases: CourseComparisonRecord[],
  ): ExploratoryDeltaFile['categories'] {
    const foundational = cases.filter((c) => this.isFoundationalOverkeep(c));
    const sibling = cases.filter((c) => this.isSiblingMisclassification(c));
    const contextual = cases.filter((c) => this.isContextualOveralignment(c));

    return {
      FOUNDATIONAL_OVERKEEP: this.createExploratoryCategory(
        foundational,
        'System keeps foundational/prerequisite courses',
        'Courses that are too basic or introductory for the user level',
      ),
      SIBLING_MISCLASSIFICATION: this.createExploratoryCategory(
        sibling,
        'System keeps sibling/adjacent topics',
        'Courses that are related but not directly relevant to the question',
      ),
      CONTEXTUAL_OVERALIGNMENT: this.createExploratoryCategory(
        contextual,
        'System keeps courses due to contextual keywords',
        'Courses that match context but are not directly useful',
      ),
    };
  }

  /**
   * Create an exploratory delta category.
   */
  private createExploratoryCategory(
    cases: CourseComparisonRecord[],
    pattern: string,
    description: string,
  ): ExploratoryDeltaCategory {
    return {
      count: cases.length,
      description,
      pattern,
      examples: cases.slice(0, 3).map((c) => ({
        queryLogId: c.subjectCode,
        question: '',
        subjectCode: c.subjectCode,
        subjectName: c.subjectName,
        systemScore: c.system.score,
        judgeReason: c.judge.reason,
      })),
    };
  }

  // Pattern detection helpers

  private isFoundationalOverkeep(course: CourseComparisonRecord): boolean {
    const lowerName = course.subjectName.toLowerCase();
    const lowerReason = course.judge.reason.toLowerCase();

    // Foundational indicators
    const foundationalIndicators = [
      'intro',
      'basic',
      'fundamental',
      'elementary',
      'beginner',
      'prerequisite',
    ];

    const hasFoundationalName = foundationalIndicators.some((indicator) =>
      lowerName.includes(indicator),
    );

    const hasJudgeBasicReason =
      lowerReason.includes('too basic') ||
      lowerReason.includes('too introductory') ||
      lowerReason.includes('beginner') ||
      lowerReason.includes('assumes knowledge');

    return hasFoundationalName || hasJudgeBasicReason;
  }

  private isSiblingMisclassification(course: CourseComparisonRecord): boolean {
    const lowerReason = course.judge.reason.toLowerCase();

    // Sibling topic indicators
    const siblingIndicators = [
      'related but',
      'adjacent',
      'sibling',
      'similar topic',
      'different field',
      'not directly',
    ];

    return siblingIndicators.some((indicator) =>
      lowerReason.includes(indicator),
    );
  }

  private isContextualOveralignment(course: CourseComparisonRecord): boolean {
    const lowerReason = course.judge.reason.toLowerCase();

    // Context over-alignment indicators
    const contextIndicators = [
      'tangential',
      'peripheral',
      'loosely related',
      'mention of',
      'context only',
    ];

    return contextIndicators.some((indicator) =>
      lowerReason.includes(indicator),
    );
  }

  private isEnablingToolUnderdrop(course: CourseComparisonRecord): boolean {
    const lowerReason = course.judge.reason.toLowerCase();

    // Enabling tool indicators
    const enablingIndicators = [
      'enabling',
      'tool for',
      'skill that enables',
      'useful tool',
      'empowers',
    ];

    return enablingIndicators.some((indicator) =>
      lowerReason.includes(indicator),
    );
  }

  private isValidPivotRejection(course: CourseComparisonRecord): boolean {
    const lowerReason = course.judge.reason.toLowerCase();

    // Valid pivot indicators
    const pivotIndicators = [
      'valid pivot',
      'logical career',
      'expansion',
      'valuable transition',
      'career change',
    ];

    return pivotIndicators.some((indicator) => lowerReason.includes(indicator));
  }

  /**
   * Extract example from a case.
   */
  private extractExample(
    cases: CourseComparisonRecord[],
  ): DisagreementPattern['example'] {
    const first = cases[0];
    return {
      question: '', // Would need to be filled from parent
      subjectCode: first.subjectCode,
      subjectName: first.subjectName,
      systemScore: first.system.score,
      judgeReason: first.judge.reason,
    };
  }

  /**
   * Generate insights from disagreement analysis.
   */
  private generateInsights(byType: DisagreementByType): {
    systemCharacter: string;
    judgeCharacter: string;
    recommendation: string;
  } {
    const exploratoryCount = byType.EXPLORATORY_DELTA.count;
    const conservativeCount = byType.CONSERVATIVE_DROP.count;
    const total = exploratoryCount + conservativeCount;

    if (total === 0) {
      return {
        systemCharacter: 'Well-aligned with judge',
        judgeCharacter: 'Consistent evaluation',
        recommendation: 'System and judge are in strong agreement',
      };
    }

    const exploratoryRatio = exploratoryCount / total;

    let systemCharacter: string;
    let recommendation: string;

    if (exploratoryRatio > 0.7) {
      systemCharacter = 'Too exploratory (keeps marginal courses)';
      recommendation =
        'Consider tightening the filtering criteria to reduce exploratory delta cases';
    } else if (exploratoryRatio < 0.3) {
      systemCharacter = 'Too conservative (drops useful courses)';
      recommendation =
        'Consider relaxing the filtering criteria to reduce conservative drop cases';
    } else {
      systemCharacter = 'Balanced but with disagreements';
      recommendation =
        'Both exploratory and conservative issues present - consider score threshold adjustments';
    }

    return {
      systemCharacter,
      judgeCharacter: 'Binary utility assessment',
      recommendation,
    };
  }

  /**
   * Generate insights for exploratory delta analysis.
   */
  private generateExploratoryDeltaInsights(
    categories: ExploratoryDeltaFile['categories'],
  ): { strength: string; weakness: string; recommendation: string } {
    const {
      FOUNDATIONAL_OVERKEEP,
      SIBLING_MISCLASSIFICATION,
      CONTEXTUAL_OVERALIGNMENT,
    } = categories;

    const strength = 'System is comprehensive in course discovery';
    let weakness = '';
    let recommendation = '';

    // Identify dominant issue
    if (
      FOUNDATIONAL_OVERKEEP.count > SIBLING_MISCLASSIFICATION.count &&
      FOUNDATIONAL_OVERKEEP.count > CONTEXTUAL_OVERALIGNMENT.count
    ) {
      weakness = 'Keeps too many foundational/introductory courses';
      recommendation =
        'Add a filter to penalize introductory courses for advanced users';
    } else if (
      SIBLING_MISCLASSIFICATION.count > FOUNDATIONAL_OVERKEEP.count &&
      SIBLING_MISCLASSIFICATION.count > CONTEXTUAL_OVERALIGNMENT.count
    ) {
      weakness = 'Keeps sibling/adjacent topics that are not directly relevant';
      recommendation =
        'Tighten semantic matching to require more direct relevance';
    } else if (CONTEXTUAL_OVERALIGNMENT.count > 0) {
      weakness = 'Over-indexes on contextual keywords';
      recommendation =
        'Reduce weight of contextual matches vs direct topic matches';
    } else {
      weakness = 'General exploratory behavior';
      recommendation =
        'Review prompt to balance comprehensiveness with precision';
    }

    return { strength, weakness, recommendation };
  }

  /**
   * Create empty disagreements result.
   */
  private createEmptyDisagreements(totalSamples: number): DisagreementsFile {
    return {
      totalDisagreements: 0,
      totalSamples,
      disagreementRate: 0,
      byType: {
        EXPLORATORY_DELTA: {
          count: 0,
          percentage: 0,
          description: 'System keeps courses that judge would drop',
          bySystemScore: { score1: 0, score2: 0, score3: 0 },
          commonPatterns: [],
          examples: [],
        },
        CONSERVATIVE_DROP: {
          count: 0,
          percentage: 0,
          description: 'System drops courses that judge would keep',
          commonPatterns: [],
          examples: [],
        },
      },
      insights: {
        systemCharacter: 'Perfect agreement with judge',
        judgeCharacter: 'Consistent evaluation',
        recommendation: 'No changes needed',
      },
    };
  }

  /**
   * Create empty exploratory delta result.
   */
  private createEmptyExploratoryDelta(): ExploratoryDeltaFile {
    return {
      description: 'Analysis of EXPLORATORY_DELTA cases',
      totalCases: 0,
      categories: {
        FOUNDATIONAL_OVERKEEP: {
          count: 0,
          description: 'System keeps foundational/prerequisite courses',
          pattern: 'FOUNDATIONAL_OVERKEEP',
          examples: [],
        },
        SIBLING_MISCLASSIFICATION: {
          count: 0,
          description: 'System keeps sibling/adjacent topics',
          pattern: 'SIBLING_MISCLASSIFICATION',
          examples: [],
        },
        CONTEXTUAL_OVERALIGNMENT: {
          count: 0,
          description: 'System keeps courses due to contextual keywords',
          pattern: 'CONTEXTUAL_OVERALIGNMENT',
          examples: [],
        },
      },
      insights: {
        strength: 'No exploratory delta cases',
        weakness: 'None identified',
        recommendation: 'System is well-calibrated',
      },
    };
  }
}
