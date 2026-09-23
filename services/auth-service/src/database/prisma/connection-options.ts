import type { validateEnvironment } from '../../config/environment';

export type DatabaseEnvironment = Omit<
  ReturnType<typeof validateEnvironment>,
  'PORT'
>;

export function prismaConnectionOptions(config: DatabaseEnvironment) {
  return {
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USERNAME,
    password: config.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    max: 5,
  };
}

// CLI needs a URL; the runtime adapter uses separate fields. Encode credentials
// explicitly so characters such as @, # and % in local passwords are preserved.
export function prismaDatabaseUrl(config: DatabaseEnvironment): string {
  const url = new URL('postgresql://localhost');
  url.hostname = config.DB_HOST;
  url.port = String(config.DB_PORT);
  url.username = encodeURIComponent(config.DB_USERNAME);
  url.password = encodeURIComponent(config.DB_PASSWORD);
  url.pathname = `/${encodeURIComponent(config.DB_NAME)}`;
  url.searchParams.set('schema', 'public');
  url.searchParams.set('connect_timeout', '5');
  return url.toString();
}
