// Default hyperparameters for all LLM providers (OpenAI, OpenRouter)

// Temperature: 0 = deterministic output, 1 = creative/random
export const LLM_TEMPERATURE = 0;

// Maximum tokens the model can generate in its response
export const LLM_MAX_OUTPUT_TOKENS = 10_000;

// Max retry attempts for failed API requests (with exponential backoff)
export const LLM_MAX_RETRIES = 1;

// Combined hyperparameters for spreading into AI SDK calls
export const LLM_HYPER_PARAMETERS = {
  temperature: LLM_TEMPERATURE,
  maxOutputTokens: LLM_MAX_OUTPUT_TOKENS,
} as const;

// Retry config for AI SDK calls
export const LLM_MAX_RETRIES_CONFIG = {
  maxRetries: LLM_MAX_RETRIES,
} as const;
