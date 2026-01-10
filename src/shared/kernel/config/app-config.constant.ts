export const AppConfigDefault = {
  NODE_ENV: 'development',
  APP_DEBUG: true,
  PORT: 3001,

  DATABASE_URL: '',

  OPENAI_API_KEY: '',

  OPENROUTER_API_KEY: '',
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',

  EMBEDDING_MODEL: 'e5-base', // Model-first: specify model, router resolves provider
  EMBEDDING_PROVIDER: 'local', // Deprecated: Use EMBEDDING_MODEL instead
  SEMANTICS_API_BASE_URL: 'http://localhost:8000/api/v1/semantics',
  QUESTION_CLASSIFIER_LLM_MODEL: 'orca-mini-3b-v2',
  SKILL_EXPANDER_LLM_MODEL: 'orca-mini-3b-v2',
  FILTER_LO_LLM_MODEL: 'orca-mini-3b-v2',
  DEFAULT_LLM_PROVIDER: 'openrouter', // Default provider when none specified
  QUERY_PROFILE_BUILDER_LLM_MODEL: 'orca-mini-3b-v2',
  ANSWER_SYNTHESIS_LLM_MODEL: 'orca-mini-3b-v2',
  COURSE_RELEVANCE_FILTER_LLM_MODEL: 'orca-mini-3b-v2',
  QUESTION_EXTRACTION_LLM_MODEL: 'gpt-4o-mini', // Entity extraction requires structured output
  USE_MOCK_QUESTION_CLASSIFIER_SERVICE: false,
  USE_MOCK_SKILL_EXPANDER_SERVICE: false,
  USE_MOCK_QUERY_PROFILE_BUILDER_SERVICE: false,
  USE_QUESTION_CLASSIFIER_CACHE: false,
  USE_SKILL_EXPANDER_CACHE: false,
};
