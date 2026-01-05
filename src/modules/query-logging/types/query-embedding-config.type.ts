/**
 * Skill type used as a key in Maps.
 */
export type Skill = string;

/**
 * Embedding configuration stored in QueryProcessStep.embedding
 */
export interface StepEmbeddingConfig {
  model: string; // e.g., "e5-base", "text-embedding-3-small"
  provider: string; // e.g., "local", "openrouter"
  dimension: number; // 768 or 1536
  totalTokens?: number; // Total tokens across all skills
  embeddingsUsage: Map<
    Skill,
    {
      model: string;
      provider: string;
      dimension: number;
      embeddedText: string; // The text that was embedded
      generatedAt: string;
      promptTokens?: number; // Input tokens (actual for OpenRouter, undefined for local)
      totalTokens?: number;
    }
  >; // Per-skill metadata
  skillsCount?: number; // Number of skills embedded
  threshold?: number; // Similarity threshold
  topN?: number; // Max results per skill
  duration?: number; // milliseconds
}
