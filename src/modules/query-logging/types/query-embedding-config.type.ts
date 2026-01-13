/**
 * Skill type used as a key in Maps.
 */
export type Skill = string;

/**
 * Per-skill embedding usage with token counts.
 */
export interface SkillEmbeddingUsage {
  skill: string;
  model: string;
  provider: string;
  dimension: number;
  embeddedText: string;
  generatedAt: string;
  promptTokens: number;
  totalTokens: number;
}

/**
 * Embedding configuration stored in QueryProcessStep.embedding
 */
export interface StepEmbeddingConfig {
  model: string; // e.g., "e5-base", "text-embedding-3-small"
  provider: string; // e.g., "local", "openrouter"
  dimension: number; // 768 or 1536
  totalTokens?: number; // Total tokens across all skills
  bySkill?: SkillEmbeddingUsage[]; // Per-skill token usage array
  skillsCount?: number; // Number of skills embedded
  threshold?: number; // Similarity threshold
  topN?: number; // Max results per skill
  duration?: number; // milliseconds
}
