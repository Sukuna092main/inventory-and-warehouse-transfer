import type { JwtModuleOptions } from '@nestjs/jwt';

export const JWT_ISSUER = 'inventory-auth';
export const JWT_AUDIENCE = 'inventory-api';

function requiredString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${key}`);
  }
  return value.trim();
}

function httpOrigin(value: string, key: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} phải là HTTP origin hợp lệ.`);
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${key} phải là HTTP origin hợp lệ.`);
  }
  return url.origin;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const port = Number(config.PORT ?? '8080');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT phải là số nguyên từ 1 đến 65535.');
  }
  const secret = requiredString(config, 'JWT_SECRET');
  if (!/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error('JWT_SECRET phải là chuỗi hex 64 ký tự.');
  }
  return {
    ...config,
    PORT: port,
    JWT_SECRET: secret,
    AUTH_SERVICE_URL: httpOrigin(
      requiredString(config, 'AUTH_SERVICE_URL'),
      'AUTH_SERVICE_URL',
    ),
    WEB_ORIGIN: httpOrigin(
      requiredString(config, 'WEB_ORIGIN'),
      'WEB_ORIGIN',
    ),
  };
}

export function jwtVerifyOptions(secret: string): JwtModuleOptions {
  return {
    secret: Buffer.from(secret, 'hex'),
    verifyOptions: {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
  };
}
