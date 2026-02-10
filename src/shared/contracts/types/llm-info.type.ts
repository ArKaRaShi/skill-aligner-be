export type LlmInfo = {
  model: string;
  /** Our router's selected provider: "openrouter" or "openai" */
  provider?: string;
  /** Token usage from LLM SDK response */
  inputTokens?: number;
  outputTokens?: number;
  systemPrompt: string;
  userPrompt: string;
  promptVersion: string;
  schemaName?: string;
  finishReason?: string;
  warnings?: Array<any>;
  /** Actual backend provider used (e.g., OpenRouter→Azure, OpenAI→undefined) */
  providerMetadata?: Record<string, any>;
  response?: {
    timestamp?: Date;
    modelId?: string;
    headers?: Record<string, string>;
  };
  hyperParameters?: Record<string, any>;
};
