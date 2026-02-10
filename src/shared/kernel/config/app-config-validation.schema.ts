import Joi from 'joi';

import { AppConfigDefault } from './app-config.constant';

export const appConfigValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default(AppConfigDefault.NODE_ENV)
    .messages({
      'string.base': `"NODE_ENV" should be a type of 'text'`,
      'any.only': `"NODE_ENV" must be one of [development, production, test]`,
      'any.required': `"NODE_ENV" is a required field`,
    }),

  APP_DEBUG: Joi.boolean().default(AppConfigDefault.APP_DEBUG).messages({
    'boolean.base': `"APP_DEBUG" should be a type of 'boolean'`,
    'any.required': `"APP_DEBUG" is a required field`,
  }),

  PORT: Joi.number().default(AppConfigDefault.PORT).messages({
    'number.base': `"PORT" should be a type of 'number'`,
    'number.empty': `"PORT" cannot be an empty field`,
    'any.required': `"PORT" is a required field`,
  }),

  DATABASE_URL: Joi.string().uri().required().messages({
    'string.base': `"DATABASE_URL" should be a type of 'text'`,
    'string.uri': `"DATABASE_URL" must be a valid URI`,
    'any.required': `"DATABASE_URL" is a required field`,
  }),

  OPENAI_API_KEY: Joi.string().optional().messages({
    'string.base': `"OPENAI_API_KEY" should be a type of 'text'`,
  }),

  OPENROUTER_API_KEY: Joi.string().optional().messages({
    'string.base': `"OPENROUTER_API_KEY" should be a type of 'text'`,
  }),

  OPENROUTER_BASE_URL: Joi.string()
    .uri()
    .default(AppConfigDefault.OPENROUTER_BASE_URL)
    .messages({
      'string.base': `"OPENROUTER_BASE_URL" should be a type of 'text'`,
      'string.uri': `"OPENROUTER_BASE_URL" must be a valid URI`,
    }),

  SEMANTICS_API_BASE_URL: Joi.string()
    .uri()
    .default(AppConfigDefault.SEMANTICS_API_BASE_URL)
    .messages({
      'string.base': `"SEMANTICS_API_BASE_URL" should be a type of 'text'`,
      'string.uri': `"SEMANTICS_API_BASE_URL" must be a valid URI`,
    }),

  EMBEDDING_MODEL: Joi.string()
    .valid('e5-base', 'text-embedding-3-small')
    .default(AppConfigDefault.EMBEDDING_MODEL)
    .messages({
      'string.base': `"EMBEDDING_MODEL" should be a type of 'text'`,
      'any.only': `"EMBEDDING_MODEL" must be one of [e5-base, text-embedding-3-small]`,
    }),

  EMBEDDING_PROVIDER: Joi.string()
    .valid('local', 'openai', 'openrouter')
    .default(AppConfigDefault.EMBEDDING_PROVIDER)
    .optional()
    .messages({
      'string.base': `"EMBEDDING_PROVIDER" should be a type of 'text'`,
      'any.only': `"EMBEDDING_PROVIDER" must be one of [local, openai, openrouter]`,
    })
    .description(
      'Deprecated: Use EMBEDDING_MODEL instead. Router resolves provider from model.',
    ),

  QUESTION_CLASSIFIER_LLM_MODEL: Joi.string()
    .default(AppConfigDefault.QUESTION_CLASSIFIER_LLM_MODEL)
    .messages({
      'string.base': `"QUESTION_CLASSIFIER_LLM_MODEL" should be a type of 'text'`,
    }),

  SKILL_EXPANDER_LLM_MODEL: Joi.string()
    .default(AppConfigDefault.SKILL_EXPANDER_LLM_MODEL)
    .messages({
      'string.base': `"SKILL_EXPANDER_LLM_MODEL" should be a type of 'text'`,
    }),

  FILTER_LO_LLM_MODEL: Joi.string()
    .default(AppConfigDefault.FILTER_LO_LLM_MODEL)
    .messages({
      'string.base': `"FILTER_LO_LLM_MODEL" should be a type of 'text'`,
    }),

  QUERY_PROFILE_BUILDER_LLM_MODEL: Joi.string()
    .default(AppConfigDefault.QUERY_PROFILE_BUILDER_LLM_MODEL)
    .messages({
      'string.base': `"QUERY_PROFILE_BUILDER_LLM_MODEL" should be a type of 'text'`,
    }),

  DEFAULT_LLM_PROVIDER: Joi.string()
    .valid('openrouter', 'openai')
    .default(AppConfigDefault.DEFAULT_LLM_PROVIDER)
    .messages({
      'string.base': `"DEFAULT_LLM_PROVIDER" should be a type of 'text'`,
      'any.only': `"DEFAULT_LLM_PROVIDER" must be one of [openrouter, openai]`,
    }),

  ANSWER_SYNTHESIS_LLM_MODEL: Joi.string()
    .default(AppConfigDefault.ANSWER_SYNTHESIS_LLM_MODEL)
    .messages({
      'string.base': `"ANSWER_SYNTHESIS_LLM_MODEL" should be a type of 'text'`,
    }),

  COURSE_RELEVANCE_FILTER_LLM_MODEL: Joi.string()
    .default(AppConfigDefault.COURSE_RELEVANCE_FILTER_LLM_MODEL)
    .messages({
      'string.base': `"COURSE_RELEVANCE_FILTER_LLM_MODEL" should be a type of 'text'`,
    }),

  QUESTION_EXTRACTION_LLM_MODEL: Joi.string()
    .default(AppConfigDefault.QUESTION_EXTRACTION_LLM_MODEL)
    .messages({
      'string.base': `"QUESTION_EXTRACTION_LLM_MODEL" should be a type of 'text'`,
    }),

  USE_MOCK_QUESTION_CLASSIFIER_SERVICE: Joi.boolean()
    .default(AppConfigDefault.USE_MOCK_QUESTION_CLASSIFIER_SERVICE)
    .messages({
      'boolean.base': `"USE_MOCK_QUESTION_CLASSIFIER_SERVICE" should be a type of 'boolean'`,
    }),

  USE_MOCK_SKILL_EXPANDER_SERVICE: Joi.boolean()
    .default(AppConfigDefault.USE_MOCK_SKILL_EXPANDER_SERVICE)
    .messages({
      'boolean.base': `"USE_MOCK_SKILL_EXPANDER_SERVICE" should be a type of 'boolean'`,
    }),

  USE_MOCK_QUERY_PROFILE_BUILDER_SERVICE: Joi.boolean()
    .default(AppConfigDefault.USE_MOCK_QUERY_PROFILE_BUILDER_SERVICE)
    .messages({
      'boolean.base': `"USE_MOCK_QUERY_PROFILE_BUILDER_SERVICE" should be a type of 'boolean'`,
    }),

  USE_QUESTION_CLASSIFIER_CACHE: Joi.boolean()
    .default(AppConfigDefault.USE_QUESTION_CLASSIFIER_CACHE)
    .messages({
      'boolean.base': `"USE_QUESTION_CLASSIFIER_CACHE" should be a type of 'boolean'`,
    }),

  USE_SKILL_EXPANDER_CACHE: Joi.boolean()
    .default(AppConfigDefault.USE_SKILL_EXPANDER_CACHE)
    .messages({
      'boolean.base': `"USE_SKILL_EXPANDER_CACHE" should be a type of 'boolean'`,
    }),
});
