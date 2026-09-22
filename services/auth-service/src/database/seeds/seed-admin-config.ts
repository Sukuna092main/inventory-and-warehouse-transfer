export class SeedAdminError extends Error {}

export function readSeedAdminConfig(env: Record<string, unknown>) {
  const required = (key: string): string => {
    const value = env[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new SeedAdminError(`Thiếu ${key} trong cấu hình local.`);
    }
    return value;
  };
  const username = required('SEED_ADMIN_USERNAME').trim().toLowerCase();
  const email = required('SEED_ADMIN_EMAIL').trim().toLowerCase();
  const password = required('SEED_ADMIN_PASSWORD');

  if (!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username)) {
    throw new SeedAdminError(
      'SEED_ADMIN_USERNAME không đúng định dạng username trong thiết kế Auth.',
    );
  }
  // Seed accepts a simple email address, not display names or quoted local parts.
  if (
    email.length > 254 ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      email,
    ) ||
    email.startsWith('.') ||
    email.includes('..') ||
    email.includes('.@') ||
    email.split('@')[0].length > 64 ||
    email
      .split('@')[1]
      .split('.')
      .some((label) => label.length > 63)
  ) {
    throw new SeedAdminError(
      'SEED_ADMIN_EMAIL không phải địa chỉ email hợp lệ.',
    );
  }
  const passwordLength = Array.from(password).length;
  if (passwordLength < 8 || passwordLength > 128) {
    throw new SeedAdminError('SEED_ADMIN_PASSWORD phải có từ 8 đến 128 ký tự.');
  }
  return { username, email, password };
}
