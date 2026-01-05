import { AnswerSynthesisPromptVersions } from '../prompts/answer-synthesis';
import { CourseRelevanceFilterPromptVersions } from '../prompts/course-relevance-filter';
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
  CLASSIFICATION: QuestionClassificationPromptVersions.V11,

  /**
   * Step 2: Skill expansion
   * Extracts skills from the user's question
   */
  SKILL_EXPANSION: SkillExpansionPromptVersions.V10,

  /**
   * Step 4: Course relevance filter
   * Filters courses by relevance to the question (runs after course retrieval)
   */
  COURSE_RELEVANCE_FILTER: CourseRelevanceFilterPromptVersions.V4,

  /**
   * Step 5: Answer synthesis
   * Generates the final answer based on retrieved and filtered courses
   */
  ANSWER_SYNTHESIS: AnswerSynthesisPromptVersions.V7,
} as const;

/**
 * Type export for type inference
 */
export type QueryPipelinePromptConfig = typeof QueryPipelinePromptConfig;
