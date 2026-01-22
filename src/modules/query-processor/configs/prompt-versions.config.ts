import { AnswerSynthesisPromptVersions } from '../prompts/answer-synthesis';
import { CourseRelevanceFilterPromptVersions } from '../prompts/course-relevance-filter';
import { QueryProfileBuilderPromptVersions } from '../prompts/query-profile-builder';
import { QuestionClassificationPromptVersions } from '../prompts/question-classification';
import { SkillExpansionPromptVersions } from '../prompts/skill-expansion';

/**
 * Centralized prompt version configuration for the query pipeline.
 *
 * All prompt versions used in AnswerQuestionUseCase are defined here
 * to avoid human error when updating versions across the pipeline.
 *
 * @example
 * To update all versions, modify this single file:
 * ```ts
 * const QueryPipelinePromptConfig = {
 *   classification: QuestionClassificationPromptVersions.V12, // Update here
 *   ...
 * };
 * ```
 */
export const QueryPipelinePromptConfig = {
  /**
   * Step 1: Question classification
   * Determines if the question is relevant, irrelevant, or dangerous
   */
  // v16: Fixed administrative constraint with explicit examples and "NO EXCEPTION"
  // v16: Added concrete fictional examples (dragon rider, etc.)
  // v16: Based on V11 structure with targeted content fixes
  // v15: Added EVALUATION ORDER section to prioritize dangerous over irrelevant
  // v15: Reduced examples from 13 to 9 (removed redundant dangerous/relevant examples)
  // v14: Added concept mapping approach, relaxed pattern requirements
  // v11: Base structure with simple pattern-based classification
  CLASSIFICATION: QuestionClassificationPromptVersions.V16,

  /**
   * Step 1: Query profile builder
   * Detects language and builds query profile (runs in parallel with classification)
   *
   * @deprecated This step is deprecated. Language detection is now handled
   *             directly in the answer synthesis step (RESPONSE LANGUAGE RULES).
   */
  // v3: Simplified to language detection only (Thai/English) - removed unused intents/preferences/background
  // v2: Added structured profile extraction (language, intent, preferences, background)
  // v1: Base version with full profile building
  QUERY_PROFILE_BUILDER: QueryProfileBuilderPromptVersions.V3,

  /**
   * Step 2: Skill expansion
   * Extracts skills from the user's question
   */
  // v9: Base version with Thai-only output and academic skill constraints (1-6 skills)
  // v9: Requires at least one skill to preserve user's explicitly mentioned concept
  SKILL_EXPANSION: SkillExpansionPromptVersions.V9,

  /**
   * Step 4: Course relevance filter
   * Filters courses by relevance to the question (runs after course retrieval)
   */
  // v8: Added explicit INPUT CONTEXT STRUCTURE section defining exact field names (code, name, outcomes)
  // v8: Added dedicated EVALUATION CONSTRAINTS (MUST FOLLOW) section with numbered rules
  // v8: Normalized field names from course_code/course_name to code/name for consistency
  // v8: Wrapped courses data in ```json code block for improved parsing
  // v8: Added explicit "Dependency Check" decision tree for Score 2 vs Score 1 disambiguation
  // v8: Formalized "Sibling Rule" for Score 1 (distinct alternatives in same category)
  // v8: Changed "Foundational / Theoretical Bridge" to "Foundational / Prerequisite Theory"
  // v7: Base structure with functional dependency scoring (0-3 ordinal rubric)
  COURSE_RELEVANCE_FILTER: CourseRelevanceFilterPromptVersions.V8,

  /**
   * Step 5: Course aggregation
   * Merges and ranks courses across multiple skills
   * (No LLM prompts used in this step)
   */

  /**
   * Step 6: Answer synthesis
   * Generates the final answer based on retrieved and filtered courses
   */
  // v14: Duplicate of v13 (no functional changes - reserved for future use)
  // v13: Base version with comprehensive formatting rules (markdown skills/courses) and tone constraints
  ANSWER_SYNTHESIS: AnswerSynthesisPromptVersions.V13,
} as const;

/**
 * Type export for type inference
 */
export type QueryPipelinePromptConfig = typeof QueryPipelinePromptConfig;
