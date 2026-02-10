import { Injectable, Logger } from '@nestjs/common';

import type {
  QuestionEvalSample,
  SampleEvaluationRecord,
  SkillComparisonRecord,
  SkillExpansionJudgeResult,
  SkillItem,
} from '../types/skill-expansion.types';

// ============================================================================
// SKILL EXPANSION COMPARISON SERVICE
// ============================================================================

/**
 * Compares system skills with judge verdicts.
 *
 * Since skill expansion doesn't filter (all skills are kept), comparison focuses on:
 * - Quality assessment (judge verdict vs system skill)
 * - Agreement (judge PASS = system provided good skill)
 * - Disagreement (judge FAIL = system provided poor skill)
 *
 * This is a pure function service - no side effects, no state management.
 */
@Injectable()
export class SkillExpansionComparisonService {
  private readonly logger = new Logger(SkillExpansionComparisonService.name);

  /**
   * Compare a single sample (question + skills) with judge results.
   *
   * Handles missing judge verdicts gracefully by defaulting to FAIL.
   *
   * @param systemSample - System skills from test set
   * @param judgeResult - Judge verdicts from LLM
   * @returns Comparison record with agreement analysis
   */
  compareSample(
    systemSample: QuestionEvalSample,
    judgeResult: SkillExpansionJudgeResult,
  ): SampleEvaluationRecord {
    const { queryLogId, question, systemSkills } = systemSample;

    this.logger.debug(
      `Comparing sample ${queryLogId}: ${systemSkills.length} system skills vs ${judgeResult.result.skills.length} judge verdicts`,
    );

    // Create map of judge verdicts by skill text for efficient lookup
    const judgeVerdictsBySkill = new Map(
      judgeResult.result.skills.map((v) => [v.skill, v]),
    );

    // Validate: ensure counts match
    if (judgeResult.result.skills.length !== systemSkills.length) {
      this.logger.error(
        `CRITICAL: Skill count mismatch in sample ${queryLogId}. System has ${systemSkills.length} skills, but judge has ${judgeResult.result.skills.length} verdicts.`,
      );
    }

    // Compare each system skill with corresponding judge verdict
    const skillComparisons: SkillComparisonRecord[] = systemSkills.map(
      (systemSkill) => {
        const judgeVerdict = judgeVerdictsBySkill.get(systemSkill.skill);

        if (!judgeVerdict) {
          this.logger.error(
            `CRITICAL: No judge verdict found for skill "${systemSkill.skill}" in sample ${queryLogId}. Using default FAIL verdict.`,
          );
          // Create a default FAIL verdict instead of throwing
          const defaultVerdict = {
            skill: systemSkill.skill,
            verdict: 'FAIL' as const,
            note: 'Missing judge verdict - defaulted to FAIL',
          };
          return this.createSkillComparisonRecord(
            systemSkill,
            defaultVerdict,
            question,
          );
        }

        return this.createSkillComparisonRecord(
          systemSkill,
          judgeVerdict,
          question,
        );
      },
    );

    // Calculate overall statistics for this question
    const overall = this.calculateOverallStats(
      skillComparisons,
      judgeResult.result.overall.conceptPreserved,
    );

    this.logger.debug(
      `Comparison complete for sample ${queryLogId}: ${skillComparisons.length} records created`,
    );

    return {
      queryLogId,
      question,
      comparison: {
        question,
        skills: skillComparisons,
        overall,
      },
      judgeResult,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Determine agreement type between system and judge.
   *
   * Since system always keeps skills:
   * - Judge PASS → AGREE (system kept a good skill)
   * - Judge FAIL → DISAGREE (system kept a poor skill)
   *
   * @param judgeVerdict - Judge's verdict for this skill
   * @returns Agreement type
   */
  determineAgreementType(judgeVerdict: 'PASS' | 'FAIL'): 'AGREE' | 'DISAGREE' {
    return judgeVerdict === 'PASS' ? 'AGREE' : 'DISAGREE';
  }

  /**
   * Create a comparison record for a single skill.
   *
   * @param systemSkill - Skill from test set
   * @param judgeVerdict - Judge's verdict for this skill (simplified format)
   * @param question - User's original question (for context)
   * @returns Comparison record with agreement analysis
   */
  private createSkillComparisonRecord(
    systemSkill: SkillItem,
    judgeVerdict: {
      skill: string;
      verdict: 'PASS' | 'FAIL';
      note: string;
    },
    question: string,
  ): SkillComparisonRecord {
    // Determine agreement type
    const agreementType = this.determineAgreementType(judgeVerdict.verdict);

    return {
      question,
      systemSkill: systemSkill.skill,
      systemReason: systemSkill.reason,
      systemLearningOutcome: systemSkill.learningOutcome,
      judgeVerdict: judgeVerdict.verdict,
      judgeNote: judgeVerdict.note,
      agreementType,
    };
  }

  /**
   * Calculate overall statistics for a question's skills.
   *
   * @param skills - Skill comparison records
   * @param conceptPreserved - From judge's overall assessment
   * @returns Overall statistics
   */
  private calculateOverallStats(
    skills: SkillComparisonRecord[],
    conceptPreserved: boolean,
  ): {
    conceptPreserved: boolean;
    agreementCount: number;
    disagreementCount: number;
    totalSkills: number;
  } {
    const agreementCount = skills.filter(
      (s) => s.agreementType === 'AGREE',
    ).length;
    const disagreementCount = skills.filter(
      (s) => s.agreementType === 'DISAGREE',
    ).length;

    // Concept preservation comes from judge's overall assessment
    return {
      conceptPreserved,
      agreementCount,
      disagreementCount,
      totalSkills: skills.length,
    };
  }
}
