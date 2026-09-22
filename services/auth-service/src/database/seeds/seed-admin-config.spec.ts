import { readSeedAdminConfig } from './seed-admin-config';

describe('Seed Admin configuration', () => {
  const env = {
    SEED_ADMIN_USERNAME: ' Admin ',
    SEED_ADMIN_EMAIL: ' Admin@Example.Test ',
    SEED_ADMIN_PASSWORD: '  Mat-khau-test-rieng  ',
  };

  it('normalizes identity without trimming the password', () => {
    expect(readSeedAdminConfig(env)).toEqual({
      username: 'admin',
      email: 'admin@example.test',
      password: env.SEED_ADMIN_PASSWORD,
    });
  });

  it.each(['SEED_ADMIN_USERNAME', 'SEED_ADMIN_EMAIL', 'SEED_ADMIN_PASSWORD'])(
    'requires %s without exposing other values',
    (key) => {
      expect(() => readSeedAdminConfig({ ...env, [key]: '' })).toThrow(key);
    },
  );

  it.each([
    ['SEED_ADMIN_USERNAME', 'admin@invalid'],
    ['SEED_ADMIN_EMAIL', 'invalid-email'],
    ['SEED_ADMIN_EMAIL', '.admin@example.test'],
    ['SEED_ADMIN_EMAIL', 'admin@-example.test'],
    ['SEED_ADMIN_EMAIL', 'a'.repeat(65) + '@example.test'],
    ['SEED_ADMIN_PASSWORD', 'short-secret'],
    ['SEED_ADMIN_PASSWORD', 'x'.repeat(129)],
  ])('rejects invalid %s without including its value', (key, value) => {
    let message = '';
    try {
      readSeedAdminConfig({ ...env, [key]: value });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain(key);
    expect(message).not.toContain(value);
    expect(message).not.toContain(env.SEED_ADMIN_PASSWORD);
  });
});
