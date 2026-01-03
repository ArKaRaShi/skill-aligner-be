// Default configuration for embedding providers

// Role for single embedding queries
export const EMBEDDING_DEFAULT_ROLE = 'query' as const;

// Role for batch embedding queries
export const EMBEDDING_BATCH_ROLE = 'passage' as const;

// Default timeout for embedding API calls
export const EMBEDDING_DEFAULT_TIMEOUT = 10_000;

// Timeout for Semantics HTTP client
export const SEMANTICS_HTTP_TIMEOUT = 15_000;

// OpenRouter embedding encoding format
export const OPENROUTER_EMBEDDING_ENCODING = 'float' as const;

// OpenRouter data collection preference
export const OPENROUTER_DATA_COLLECTION = 'deny' as const;
