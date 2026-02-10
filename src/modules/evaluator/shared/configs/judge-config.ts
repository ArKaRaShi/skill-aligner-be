/**
 * Centralized judge model and provider configuration for all evaluators.
 *
 * All evaluator judge models and providers are defined here
 * to avoid human error when updating configurations across the evaluation system.
 *
 * Model and provider names MUST match the LLM registry:
 * - Models: See src/shared/adapters/llm/constants/model-registry.constant.ts
 * - Providers: 'openai' or 'openrouter'
 *
 * @example
 * To update judge model for all evaluators, modify this single file:
 * ```ts
 * const EvaluatorJudgeConfig = {
 *   skillExpansion: {
 *     judgeModel: 'gpt-4o-mini', // Update here (must match registry)
 *     judgeProvider: 'openai',   // Update here (must match registry)
 *   },
 *   ...
 * };
 * ```
 */

/**
 * Default timeout for judge LLM evaluation calls (in milliseconds)
 */

export const DEFAULT_JUDGE_TIMEOUT_MS = 60_000 as const;

export const EvaluatorJudgeConfig = {
  /**
   * Skill Expansion Evaluator
   * Evaluates the quality of extracted skills
   */
  SKILL_EXPANSION: {
    /** Judge model (must match LLM_MODEL_REGISTRATIONS.baseModel) */
    JUDGE_MODEL: 'gpt-5-mini',
    /** Judge provider (must be 'openai' or 'openrouter') */
    JUDGE_PROVIDER: 'openrouter',
  },

  /**
   * Course Relevance Filter Evaluator
   * Evaluates course filtering decisions using binary judge
   */
  COURSE_RELEVANCE_FILTER: {
    /** Judge model (must match LLM_MODEL_REGISTRATIONS.baseModel) */
    JUDGE_MODEL: 'gpt-4.1-mini',
    /** Judge provider (must be 'openai' or 'openrouter') */
    JUDGE_PROVIDER: 'openrouter',
  },

  /**
   * Course Retriever Evaluator
   * Evaluates semantic search retrieval quality
   */
  COURSE_RETRIEVAL: {
    /** Judge model (must match LLM_MODEL_REGISTRATIONS.baseModel) */
    JUDGE_MODEL: 'gpt-4.1-mini',
    /** Judge provider (must be 'openai' or 'openrouter') */
    JUDGE_PROVIDER: 'openrouter',
  },

  /**
   * Answer Synthesis Evaluator
   * Evaluates generated answer quality (faithfulness + completeness)
   */
  ANSWER_SYNTHESIS: {
    /** Judge model (must match LLM_MODEL_REGISTRATIONS.baseModel) */
    JUDGE_MODEL: 'gpt-5-mini',
    /** Judge provider (must be 'openai' or 'openrouter') */
    JUDGE_PROVIDER: 'openrouter',
  },

  /**
   * NOTE: Question Classification Evaluator is NOT included here
   * per user request - it should be configured separately if needed.
   */
} as const;

/**
 * Type export for type inference
 */
export type EvaluatorJudgeConfigType = typeof EvaluatorJudgeConfig;
