import { appConfigValidationSchema } from '../app-config-validation.schema';

describe('appConfigValidationSchema', () => {
  it('accepts minimal valid config with database url', () => {
    const { error, value } = appConfigValidationSchema.validate({
      DATABASE_URL:
        'postgresql://user:password@localhost:5432/testdb?schema=public',
    });

    expect(error).toBeUndefined();
    expect(value.DATABASE_URL).toBe(
      'postgresql://user:password@localhost:5432/testdb?schema=public',
    );
  });

  it('rejects invalid NODE_ENV', () => {
    const { error } = appConfigValidationSchema.validate({
      NODE_ENV: 'staging',
      DATABASE_URL:
        'postgresql://user:password@localhost:5432/testdb?schema=public',
    });

    expect(error).toBeDefined();
  });

  it('rejects invalid DATABASE_URL', () => {
    const { error } = appConfigValidationSchema.validate({
      DATABASE_URL: 'not-a-url',
    });

    expect(error).toBeDefined();
  });
});
