/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ValidationResult } from 'joi';

import { appConfigValidationSchema } from '../app-config-validation.schema';
import { AppConfigDefault } from '../app-config.constant';

interface ValidationConfig {
  NODE_ENV?: string;
  APP_DEBUG?: boolean;
  PORT?: number;
  DATABASE_URL?: string;
  OPENAI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  SEMANTICS_API_BASE_URL?: string;
  EMBEDDING_PROVIDER?: string;
}

const requiredFields: ValidationConfig = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  OPENAI_API_KEY: 'test-openai-key',
  OPENROUTER_API_KEY: 'test-openrouter-key',
};

const validate = (
  config: ValidationConfig,
): ValidationResult<ValidationConfig> =>
  appConfigValidationSchema.validate(config);

const expectErrorMessage = (config: ValidationConfig, expected: string) => {
  const { error } = validate(config);
  expect(error?.message).toBe(expected);
};

const requireValid = (config: ValidationConfig): ValidationConfig => {
  const result = validate(config);

  if (result.error) {
    throw result.error;
  }

  return result.value;
};

describe('appConfigValidationSchema', () => {
  describe('NODE_ENV', () => {
    it.each(['development', 'production', 'test'])('accepts %s', (value) => {
      const { error } = validate({ ...requiredFields, NODE_ENV: value });
      expect(error).toBeUndefined();
    });

    it('rejects invalid value', () => {
      expectErrorMessage(
        {
          ...requiredFields,
          NODE_ENV: 'invalid',
        },
        '"NODE_ENV" must be one of [development, production, test]',
      );
    });

    it('defaults to AppConfigDefault.NODE_ENV when omitted', () => {
      const value = requireValid({ ...requiredFields });
      expect(value.NODE_ENV).toBe(AppConfigDefault.NODE_ENV);
    });
  });

  describe('APP_DEBUG', () => {
    it.each([true, false])('accepts boolean value %s', (flag) => {
      const { error } = validate({ ...requiredFields, APP_DEBUG: flag });
      expect(error).toBeUndefined();
    });

    it('rejects non-boolean values', () => {
      expectErrorMessage(
        {
          ...requiredFields,
          APP_DEBUG: 'invalid' as unknown as boolean,
        },
        '"APP_DEBUG" should be a type of \'boolean\'',
      );
    });

    it('defaults to AppConfigDefault.APP_DEBUG when omitted', () => {
      const value = requireValid({ ...requiredFields });
      expect(value.APP_DEBUG).toBe(AppConfigDefault.APP_DEBUG);
    });
  });

  describe('PORT', () => {
    it('accepts numeric values', () => {
      const { error } = validate({ ...requiredFields, PORT: 8080 });
      expect(error).toBeUndefined();
    });

    it('rejects non-numeric values', () => {
      expectErrorMessage(
        {
          ...requiredFields,
          PORT: 'invalid' as unknown as number,
        },
        '"PORT" should be a type of \'number\'',
      );
    });

    it('defaults to AppConfigDefault.PORT when omitted', () => {
      const value = requireValid({ ...requiredFields });
      expect(value.PORT).toBe(AppConfigDefault.PORT);
    });
  });

  describe('DATABASE_URL', () => {
    it('accepts valid URIs', () => {
      const { error } = validate({ ...requiredFields });
      expect(error).toBeUndefined();
    });

    it('rejects malformed URIs', () => {
      expectErrorMessage(
        {
          ...requiredFields,
          DATABASE_URL: 'not-a-uri',
        },
        '"DATABASE_URL" must be a valid URI',
      );
    });

    it('requires DATABASE_URL', () => {
      const { DATABASE_URL: _db, ...configWithoutDb } = requiredFields;
      expectErrorMessage(configWithoutDb, '"DATABASE_URL" is a required field');
    });
  });

  describe('OPENAI_API_KEY', () => {
    it('accepts non-empty strings', () => {
      const { error } = validate({ ...requiredFields });
      expect(error).toBeUndefined();
    });

    it('rejects empty strings', () => {
      expectErrorMessage(
        {
          ...requiredFields,
          OPENAI_API_KEY: '',
        },
        '"OPENAI_API_KEY" cannot be an empty field',
      );
    });

    it('requires OPENAI_API_KEY', () => {
      const { OPENAI_API_KEY: _openAi, ...configWithoutOpenAi } =
        requiredFields;

      expectErrorMessage(
        configWithoutOpenAi,
        '"OPENAI_API_KEY" is a required field',
      );
    });
  });

  describe('OPENROUTER_API_KEY', () => {
    it('accepts non-empty strings', () => {
      const { error } = validate({ ...requiredFields });
      expect(error).toBeUndefined();
    });

    it('rejects empty strings', () => {
      expectErrorMessage(
        {
          ...requiredFields,
          OPENROUTER_API_KEY: '',
        },
        '"OPENROUTER_API_KEY" cannot be an empty field',
      );
    });

    it('requires OPENROUTER_API_KEY', () => {
      const { OPENROUTER_API_KEY: _openRouter, ...configWithoutOpenRouter } =
        requiredFields;

      expectErrorMessage(
        configWithoutOpenRouter,
        '"OPENROUTER_API_KEY" is a required field',
      );
    });
  });

  describe('SEMANTICS_API_BASE_URL', () => {
    it('accepts valid URIs', () => {
      const { error } = validate({
        ...requiredFields,
        SEMANTICS_API_BASE_URL: 'https://example.com/api',
      });
      expect(error).toBeUndefined();
    });

    it('rejects malformed URIs', () => {
      expectErrorMessage(
        {
          ...requiredFields,
          SEMANTICS_API_BASE_URL: 'not-a-uri',
        },
        '"SEMANTICS_API_BASE_URL" must be a valid URI',
      );
    });

    it('defaults to AppConfigDefault.SEMANTICS_API_BASE_URL when omitted', () => {
      const value = requireValid({ ...requiredFields });
      expect(value.SEMANTICS_API_BASE_URL).toBe(
        AppConfigDefault.SEMANTICS_API_BASE_URL,
      );
    });
  });

  describe('EMBEDDING_PROVIDER', () => {
    it.each(['e5', 'openai'])('accepts %s', (provider) => {
      const { error } = validate({
        ...requiredFields,
        EMBEDDING_PROVIDER: provider,
      });
      expect(error).toBeUndefined();
    });

    it('rejects unsupported providers', () => {
      expectErrorMessage(
        {
          ...requiredFields,
          EMBEDDING_PROVIDER: 'unknown',
        },
        '"EMBEDDING_PROVIDER" must be one of [e5, openai]',
      );
    });

    it('defaults to AppConfigDefault.EMBEDDING_PROVIDER when omitted', () => {
      const value = requireValid({ ...requiredFields });
      expect(value.EMBEDDING_PROVIDER).toBe(
        AppConfigDefault.EMBEDDING_PROVIDER,
      );
    });
  });
});
