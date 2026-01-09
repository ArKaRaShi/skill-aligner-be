import { EntityExtractionPromptVersions } from '../prompts/entity-extraction';

/**
 * Centralized prompt version configuration for the question-analyses module.
 *
 * All prompt versions used in the entity extraction workflow are defined here
 * to avoid human error when updating versions.
 *
 * @example
 * To update the extraction prompt version:
 * ```ts
 * const QuestionAnalysisPromptConfig = {
 *   ENTITY_EXTRACTION: EntityExtractionPromptVersions.V2, // Update here
 * };
 * ```
 */
export const QuestionAnalysisPromptConfig = {
  /**
   * Entity extraction prompt version
   * Extracts topics, skills, tasks, and roles from user questions
   */
  ENTITY_EXTRACTION: EntityExtractionPromptVersions.V1,
} as const;

/**
 * Type export for type inference
 */
export type QuestionAnalysisPromptConfig = typeof QuestionAnalysisPromptConfig;

/**
 * Centralized LLM configuration for the question-analyses module.
 *
 * Default models and schema names used across the extraction workflow.
 *
 * @example
 * Usage in QuestionExtractionService:
 * ```ts
 * import { QuestionAnalysisLlmConfig } from '../constants/config.constant';
 *
 * const llmResult = await this.llmRouter.generateObject({
 *   model: model ?? QuestionAnalysisLlmConfig.DEFAULT_MODEL,
 *   schemaName: QuestionAnalysisLlmConfig.SCHEMA_NAME,
 *   ...
 * });
 * ```
 */
export const QuestionAnalysisLlmConfig = {
  /**
   * Default LLM model for entity extraction
   * Uses GPT-4.1-mini for cost-effective extraction
   */
  DEFAULT_MODEL: 'gpt-4.1-mini',

  /**
   * Schema name for structured extraction output
   * Used by LLM for response validation
   */
  SCHEMA_NAME: 'EntityExtractionSchema',

  /**
   * Prompt version for LLM metadata tracking
   * Should match QuestionAnalysisPromptConfig.ENTITY_EXTRACTION
   */
  PROMPT_VERSION: QuestionAnalysisPromptConfig.ENTITY_EXTRACTION,
} as const;

/**
 * Type export for type inference
 */
export type QuestionAnalysisLlmConfig = typeof QuestionAnalysisLlmConfig;

/**
 * Centralized extraction workflow constants.
 *
 * Configuration values for the extraction process including limits,
 * multipliers, and default values.
 *
 * @example
 * Usage in repositories and services:
 * ```ts
 * import { QuestionAnalysisExtractionConfig } from '../constants/config.constant';
 *
 * const limit = QuestionAnalysisExtractionConfig.DEFAULT_QUERY_LIMIT;
 * const fetchMultiplier = QuestionAnalysisExtractionConfig.QUESTION_FETCH_MULTIPLIER;
 * const startingNumber = QuestionAnalysisExtractionConfig.STARTING_EXTRACTION_NUMBER;
 * ```
 */
export const QuestionAnalysisExtractionConfig = {
  /**
   * Default limit for analytics queries
   * Used when no explicit limit is provided
   */
  DEFAULT_QUERY_LIMIT: 20,

  /**
   * Multiplier for fetching questions to ensure enough unique results
   * Fetches 2x the requested limit to account for duplicates
   */
  QUESTION_FETCH_MULTIPLIER: 2,

  /**
   * Starting extraction number when no previous analysis exists
   * Auto-increment begins from this value
   */
  STARTING_EXTRACTION_NUMBER: 1,

  /**
   * Default extraction cost value
   * Will be calculated by TokenCostCalculator if needed
   */
  DEFAULT_EXTRACTION_COST: 0,
} as const;

/**
 * Type export for type inference
 */
export type QuestionAnalysisExtractionConfig =
  typeof QuestionAnalysisExtractionConfig;

/**
 * Centralized quality level constants.
 *
 * Quality assessment strings used in SQL queries and type definitions.
 * These correspond to the ExtractionQuality type but provide runtime values.
 *
 * @example
 * Usage in SQL queries:
 * ```ts
 * import { QuestionAnalysisQualityLevels } from '../constants/config.constant';
 *
 * SUM(CASE WHEN overall_quality = '${QuestionAnalysisQualityLevels.HIGH}' THEN 1 ELSE 0 END)
 * ```
 */
export const QuestionAnalysisQualityLevels = {
  /** High quality: At least one HIGH confidence entity, clear learning intent */
  HIGH: 'high',

  /** Medium quality: At least one MEDIUM confidence entity, reasonable learning intent */
  MEDIUM: 'medium',

  /** Low quality: Only LOW confidence entities, ambiguous learning intent */
  LOW: 'low',

  /** No quality: No entities extracted, or irrelevant question */
  NONE: 'none',
} as const;

/**
 * Type export for type inference
 */
export type QuestionAnalysisQualityLevels =
  typeof QuestionAnalysisQualityLevels;

/**
 * Centralized entity type constants.
 *
 * Entity type strings used for mapping and classification.
 * These correspond to the EntityType type but provide runtime values.
 *
 * @example
 * Usage in service mapping:
 * ```ts
 * import { QuestionAnalysisEntityTypes } from '../constants/config.constant';
 *
 * const entities: CreateExtractedEntityInput[] = [
 *   ...this.mapEntities(extractionData.mentionTopics ?? [], QuestionAnalysisEntityTypes.TOPIC),
 *   ...this.mapEntities(extractionData.mentionSkills ?? [], QuestionAnalysisEntityTypes.SKILL),
 *   ...
 * ];
 * ```
 */
export const QuestionAnalysisEntityTypes = {
  /** Topic: Broad subject areas (e.g., "AI", "Personal Finance") */
  TOPIC: 'topic',

  /** Skill: Specific abilities and competencies (e.g., "Python", "Financial Analysis") */
  SKILL: 'skill',

  /** Task: Activities and goals (e.g., "Making a Website", "solve Leetcode problems") */
  TASK: 'task',

  /** Role: Job titles and career positions (e.g., "Data Scientist", "Software Engineer") */
  ROLE: 'role',
} as const;

/**
 * Type export for type inference
 */
export type QuestionAnalysisEntityTypes = typeof QuestionAnalysisEntityTypes;
