/**
 * Shared test fixtures for QueryPipelineReaderService integration tests
 */
import { LlmInfo } from 'src/shared/contracts/types/llm-info.type';

/**
 * Test question used across all integration tests
 */
export const testQuestion =
  'What courses should I take to learn Python programming?';

/**
 * Helper: Create mock LLM info for testing
 * @param overrides - Optional overrides for default values
 * @returns Mock LlmInfo object
 */
export const createMockLlmInfo = (
  overrides: Partial<LlmInfo> = {},
): LlmInfo => ({
  model: 'gpt-4',
  provider: 'openai',
  inputTokens: 100,
  outputTokens: 50,
  userPrompt: 'Test prompt',
  systemPrompt: 'Test system prompt',
  promptVersion: 'v1',
  finishReason: 'stop',
  warnings: [],
  ...overrides,
});
