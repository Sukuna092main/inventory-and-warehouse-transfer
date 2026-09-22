import { hashPassword, verifyPassword } from './password';

describe('Password hashing', () => {
  const password = ' mat-khau-test-dai ';

  it('verifies the exact password, preserving Unicode and spaces', async () => {
    const hash = await hashPassword(password);
    expect(hash).not.toContain(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword(password.trim(), hash)).toBe(false);
    expect(await verifyPassword('mat-khau-khac-hoan-toan', hash)).toBe(false);
  });

  it('generates a new salt for each hash of the same password', async () => {
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(await verifyPassword(password, second)).toBe(true);
  });

  it.each(['', 'scrypt$999999999$8$1$bad$hash', 'bcrypt$invalid'])(
    'rejects unsupported or malformed stored hashes',
    async (hash) => {
      expect(await verifyPassword(password, hash)).toBe(false);
    },
  );

  it.each(['short', ' '.repeat(15), 'a'.repeat(129)])(
    'rejects invalid new password length/content',
    async (invalid) => {
      await expect(hashPassword(invalid)).rejects.toThrow();
    },
  );
});
