export const AppConfigDefault = {
  NODE_ENV: 'development',
  APP_DEBUG: true,
  PORT: 3001,

  DATABASE_URL: '',

  OPENAI_API_KEY: '',

  OPENROUTER_API_KEY: '',
  OPENROUTER_BASE_URL: 'https://openrouter.ai/api/v1',

  EMBEDDING_PROVIDER: 'e5',
  SEMANTICS_API_BASE_URL: 'http://localhost:8000/api/v1/semantics',
  GPT_LLM_PROVIDER: 'openrouter',
  GPT_LLM_MODEL: 'orca-mini-3b-v2',
  USE_MOCK_QUESTION_CLASSIFIER_SERVICE: false,
  USE_MOCK_SKILL_EXPANDER_SERVICE: false,
  USE_MOCK_ANSWER_GENERATOR_SERVICE: false,
};
