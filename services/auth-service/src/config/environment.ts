function requiredString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Thieu bien moi truong bat buoc: ${key}`);
  }
  return value;
}

function port(value: unknown, key: string): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error(`${key} phai la so nguyen tu 1 den 65535`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${key} phai la so nguyen tu 1 den 65535`);
  }
  return parsed;
}

export function validateEnvironment(config: Record<string, unknown>) {
  return {
    ...config,
    PORT: port(config.PORT ?? '3000', 'PORT'),
    DB_HOST: requiredString(config, 'DB_HOST').trim(),
    DB_PORT: port(config.DB_PORT, 'DB_PORT'),
    DB_NAME: requiredString(config, 'DB_NAME').trim(),
    DB_USERNAME: requiredString(config, 'DB_USERNAME').trim(),
    DB_PASSWORD: requiredString(config, 'DB_PASSWORD'),
  };
}
