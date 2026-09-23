import type { JwtModuleOptions } from '@nestjs/jwt';

export const ACCESS_TOKEN_TTL_SECONDS = 30 * 60;
export const JWT_ISSUER = 'inventory-auth';
export const JWT_AUDIENCE = 'inventory-api';

export function jwtOptions(secret: unknown): JwtModuleOptions {
  if (typeof secret !== 'string' || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error(
      'JWT_SECRET phải là chuỗi hex 64 ký tự tạo từ 32 byte ngẫu nhiên.',
    );
  }
  return {
    secret: Buffer.from(secret, 'hex'),
    signOptions: {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
    verifyOptions: {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  };
}
