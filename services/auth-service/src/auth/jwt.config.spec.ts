import { randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { jwtOptions, JWT_AUDIENCE, JWT_ISSUER } from './jwt.config';

describe('JWT configuration', () => {
  it.each([undefined, '', 'short', 'g'.repeat(64)])(
    'rejects missing or malformed secret without showing it',
    (secret) => {
      expect(() => jwtOptions(secret)).toThrow('JWT_SECRET');
    },
  );

  it('checks signature, issuer, audience, algorithm and expiry', async () => {
    const jwt = new JwtService(jwtOptions(randomBytes(32).toString('hex')));
    const token = await jwt.signAsync({ sub: 'test-user' });
    const payload = await jwt.verifyAsync<{
      sub: string;
      iat: number;
      exp: number;
    }>(token);
    expect(payload.sub).toBe('test-user');
    expect(payload.exp - payload.iat).toBe(1800);
    await expect(
      jwt.verifyAsync(token, { clockTimestamp: payload.exp }),
    ).rejects.toThrow();
    const otherKey = new JwtService(
      jwtOptions(randomBytes(32).toString('hex')),
    );
    await expect(otherKey.verifyAsync(token)).rejects.toThrow();
    for (const overrides of [
      { issuer: 'other-issuer', audience: JWT_AUDIENCE },
      { issuer: JWT_ISSUER, audience: 'other-audience' },
      { algorithm: 'HS384' as const },
    ]) {
      const invalid = await jwt.signAsync({ sub: 'test-user' }, overrides);
      await expect(jwt.verifyAsync(invalid)).rejects.toThrow();
    }
  });
});
