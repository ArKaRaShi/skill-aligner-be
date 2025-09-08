import { appConfigValidationSchema } from '../app-config-validation.schema';
import { AppConfigDefault } from '../app-config.constant';

interface ValidationConfig {
  NODE_ENV?: string;
  APP_DEBUG?: boolean;
  PORT?: number;
  DATABASE_URL?: string;
  OPENROUTER_API_KEY?: string;
}

const validRequiredFields = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  OPENROUTER_API_KEY: 'valid-api-key',
};

describe('appConfigValidationSchema', () => {
  describe('NODE_ENV validation', () => {
    it('should allow valid environment values', () => {
      const validValues = ['development', 'production', 'test'];
      validValues.forEach((value) => {
        const { error } = appConfigValidationSchema.validate({
          ...validRequiredFields,
          NODE_ENV: value,
        } as ValidationConfig);
        expect(error).toBeUndefined();
      });
    });

    it('should reject invalid environment values', () => {
      const { error } = appConfigValidationSchema.validate({
        ...validRequiredFields,
        NODE_ENV: 'invalid',
      } as ValidationConfig);
      expect(error?.message).toBe(
        '"NODE_ENV" must be one of [development, production, test]',
      );
    });

    it('should default to development when not provided', () => {
      const { value } = appConfigValidationSchema.validate({
        ...validRequiredFields,
      } as ValidationConfig) as { value: ValidationConfig };
      expect(value.NODE_ENV).toBe(AppConfigDefault.NODE_ENV);
    });
  });

  describe('APP_DEBUG validation', () => {
    it('should allow boolean values', () => {
      const validValues = [true, false];
      validValues.forEach((value) => {
        const { error } = appConfigValidationSchema.validate({
          ...validRequiredFields,
          APP_DEBUG: value,
        } as ValidationConfig);
        expect(error).toBeUndefined();
      });
    });

    it('should reject non-boolean values', () => {
      const { error } = appConfigValidationSchema.validate({
        ...validRequiredFields,
        APP_DEBUG: 'non-boolean',
      });
      expect(error?.message).toBe(
        '"APP_DEBUG" should be a type of \'boolean\'',
      );
    });

    it('should default to AppConfigDefault.APP_DEBUG when not provided', () => {
      const { value } = appConfigValidationSchema.validate({
        ...validRequiredFields,
      } as ValidationConfig) as { value: ValidationConfig };
      expect(value.APP_DEBUG).toBe(AppConfigDefault.APP_DEBUG);
    });
  });

  describe('PORT validation', () => {
    it('should allow valid port numbers', () => {
      const { error } = appConfigValidationSchema.validate({
        ...validRequiredFields,
        PORT: 3000,
      } as ValidationConfig);
      expect(error).toBeUndefined();
    });

    it('should reject non-numeric values', () => {
      const { error } = appConfigValidationSchema.validate({
        ...validRequiredFields,
        PORT: 'invalid',
      });
      expect(error?.message).toBe('"PORT" should be a type of \'number\'');
    });

    it('should default to AppConfigDefault.PORT when not provided', () => {
      const { value } = appConfigValidationSchema.validate({
        ...validRequiredFields,
      } as ValidationConfig) as { value: ValidationConfig };
      expect(value.PORT).toBe(AppConfigDefault.PORT);
    });
  });

  describe('DATABASE_URL validation', () => {
    it('should allow valid URI strings', () => {
      const validUrl = 'postgresql://user:pass@localhost:5432/db';
      const { error } = appConfigValidationSchema.validate({
        ...validRequiredFields,
        DATABASE_URL: validUrl,
      } as ValidationConfig);
      expect(error).toBeUndefined();
    });

    it('should reject invalid URI strings', () => {
      const { error } = appConfigValidationSchema.validate({
        ...validRequiredFields,
        DATABASE_URL: 'not-a-uri',
      } as ValidationConfig);
      expect(error?.message).toBe('"DATABASE_URL" must be a valid URI');
    });

    it('should require DATABASE_URL to be provided', () => {
      const { error } = appConfigValidationSchema.validate({
        OPENROUTER_API_KEY: validRequiredFields.OPENROUTER_API_KEY,
      } as ValidationConfig);
      expect(error?.message).toBe('"DATABASE_URL" is a required field');
    });
  });

  describe('OPENROUTER_API_KEY validation', () => {
    it('should allow non-empty string values', () => {
      const { error } = appConfigValidationSchema.validate({
        ...validRequiredFields,
      } as ValidationConfig);
      expect(error).toBeUndefined();
    });

    it('should reject empty strings', () => {
      const { error } = appConfigValidationSchema.validate({
        DATABASE_URL: validRequiredFields.DATABASE_URL,
        OPENROUTER_API_KEY: '',
      } as ValidationConfig);
      expect(error?.message).toBe(
        '"OPENROUTER_API_KEY" cannot be an empty field',
      );
    });

    it('should require OPENROUTER_API_KEY to be provided', () => {
      const { error } = appConfigValidationSchema.validate({
        DATABASE_URL: validRequiredFields.DATABASE_URL,
      } as ValidationConfig);
      expect(error?.message).toBe('"OPENROUTER_API_KEY" is a required field');
    });
  });
});
