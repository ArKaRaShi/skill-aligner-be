/**
 * LLM configuration stored in QueryProcessStep.llm
 */
export interface StepLlmConfig {
  // Core fields (for easy querying)
  provider?: string; // Our router's choice (e.g., "openrouter")
  model?: string; // Model requested (e.g., "openai/gpt-4o-mini")
  promptVersion?: string;

  // Prompts & Schema
  systemPromptHash?: string; // SHA-256 hash of system prompt
  userPrompt?: string; // User/formatted prompt sent to LLM
  schemaName?: string; // Schema name for evaluation
  schemaShape?: object; // Schema structure (Zod shape)

  // Token usage & cost (extracted for easy access)
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;

  // Full SDK metadata (for complete trace)
  fullMetadata?: {
    // From AI SDK result
    finishReason?: string; // "stop", "length", "content-filter"
    warnings?: Array<any>; // SDK warnings

    // From providerMetadata (OpenRouter-specific, etc.)
    providerMetadata?: Record<string, any>; // Provider-specific info

    // From response metadata
    response?: {
      timestamp?: Date; // When response started
      modelId?: string; // Actual model used by backend
      headers?: Record<string, string>; // HTTP headers
    };

    // Raw SDK fields if needed
    raw?: any; // Anything else from SDK
  };

  // Legacy parameters field (for backward compatibility)
  parameters?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxTokens?: number;
    seed?: number;
  };
}
