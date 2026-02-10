/**
 * Embedding usage types for tracking token consumption and costs.
 *
 * Supports both actual tokens (from API responses) and estimated tokens (for local models).
 */

/**
 * Per-skill embedding usage with token counts and metadata.
 */
export type SkillEmbeddingUsage = {
  skill: string;
  model: string;
  provider: string;
  dimension: number;
  embeddedText: string;
  generatedAt: string;
  promptTokens: number;
  totalTokens: number;
};

/**
 * Aggregated embedding usage across all skills.
 */
export type EmbeddingUsage = {
  bySkill: SkillEmbeddingUsage[];
  totalTokens: number;
};

/**
 * Single-query embedding usage with token counts and metadata.
 */
export type QueryEmbeddingUsage = {
  query: string;
  model: string;
  provider: string;
  dimension: number;
  embeddedText: string;
  generatedAt: string;
  promptTokens: number;
  totalTokens: number;
};
