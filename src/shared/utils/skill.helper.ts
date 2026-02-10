import { Skill } from 'src/shared/contracts/types/skill.type';

/**
 * Helper class for Skill type conversions and validations.
 * Provides static methods to safely convert between string and Skill types.
 */
export class SkillHelper {
  /**
   * Safely cast a string to Skill.
   * Use this when converting LLM output or external strings to typed Skills.
   *
   * @param value - The string value to cast to Skill
   * @returns The value as a Skill type
   * @throws Error if value is empty or invalid
   *
   * @example
   * const rawSkills = await llmService.expandSkills(question);
   * const skills: Skill[] = rawSkills.map((s) => SkillHelper.asSkill(s.skill));
   */
  static asSkill(value: string): Skill {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      throw new Error('Skill cannot be empty');
    }
    return trimmed as Skill;
  }

  /**
   * Batch convert strings to Skills.
   *
   * @param values - Array of strings to convert
   * @returns Array of Skills
   *
   * @example
   * const skillStrings = ['python', 'javascript'];
   * const skills = SkillHelper.asSkills(skillStrings);
   */
  static asSkills(values: string[]): Skill[] {
    return values.map((v) => this.asSkill(v));
  }

  /**
   * Type guard to check if a value is a valid Skill.
   * Useful for filtering/validation.
   *
   * @param value - Value to check
   * @returns True if the value is a non-empty string
   *
   * @example
   * const maybeSkills: unknown[] = ['python', '', null, 123];
   * const skills = maybeSkills.filter(SkillHelper.isSkill); // ['python']
   */
  static isSkill(value: unknown): value is Skill {
    return typeof value === 'string' && value.trim().length > 0;
  }
}
