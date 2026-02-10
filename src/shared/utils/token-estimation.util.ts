/**
 * Token estimation utilities for models that don't return token counts.
 *
 * Uses a simple character-based estimation: ~4 characters per token.
 * This is a rough approximation suitable for local embedding models like e5-base.
 */

/**
 * Estimate the number of tokens for a given text.
 * Uses ~4 characters per token as a rough approximation.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated number of tokens
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  // Approximate: ~4 characters per token
  // This is a common heuristic for English text
  return Math.ceil(text.length / 4);
}
