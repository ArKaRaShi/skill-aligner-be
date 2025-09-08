import Joi from 'joi';
import { AppConfigDefault } from './app-config.constant';

export const appValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default(AppConfigDefault.NODE_ENV)
    .messages({
      'string.base': `"NODE_ENV" should be a type of 'text'`,
      'any.only': `"NODE_ENV" must be one of [development, production, test, provision]`,
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

  OPENROUTER_API_KEY: Joi.string().required().messages({
    'string.base': `"OPENROUTER_API_KEY" should be a type of 'text'`,
    'string.empty': `"OPENROUTER_API_KEY" cannot be an empty field`,
    'any.required': `"OPENROUTER_API_KEY" is a required field`,
  }),
});
