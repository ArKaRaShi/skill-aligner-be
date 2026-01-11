// Default configuration for all LLM providers (OpenAI, OpenRouter)

// ============================================================================
// Model Hyperparameters
// ============================================================================

// Temperature: 0 = deterministic output, 1 = creative/random
export const LLM_TEMPERATURE = 0;

// Maximum tokens the model can generate in its response
export const LLM_MAX_OUTPUT_TOKENS = 10_000;

// Combined hyperparameters for spreading into AI SDK calls
export const LLM_HYPER_PARAMETERS = {
  temperature: LLM_TEMPERATURE,
  maxOutputTokens: LLM_MAX_OUTPUT_TOKENS,
} as const;

// ============================================================================
// Timeout Configuration
// ============================================================================

// Request timeout in milliseconds (15 seconds)
// NOTE: This is an infrastructure setting, NOT a model hyperparameter
// Used with AbortSignal.timeout() in generateText/generateObject calls
export const LLM_REQUEST_TIMEOUT = 15_000;

// ============================================================================
// AI SDK Retry Configuration
// ============================================================================

// Max retry attempts for failed API requests (with exponential backoff)
// This is used by the AI SDK's built-in retry mechanism for HTTP errors and rate limits
export const LLM_MAX_RETRIES = 1;

// Retry config for AI SDK calls
export const LLM_MAX_RETRIES_CONFIG = {
  maxRetries: LLM_MAX_RETRIES,
} as const;

// ============================================================================
// Provider-Level Timeout Retry Configuration
// ============================================================================

// The AI SDK's maxRetries doesn't consistently handle AbortError from AbortSignal.timeout()
// These constants are used by the provider-level retry wrapper in BaseLlmProvider

// Maximum number of retry attempts specifically for timeout/abort errors
export const LLM_MAX_TIMEOUT_RETRIES = 1;

// Delay in milliseconds before retrying a timed-out request
export const LLM_RETRY_DELAY_MS = 500;
