import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { validateEnvironment } from '../src/config/environment';
import { readLocalEnvironment } from '../src/config/local-environment';

type QueryResult<T> = { rows: T[]; rowCount: number | null };

export interface TestPgClient {
  connect(): Promise<void>;
  end(): Promise<void>;
  query<T = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<T>>;
}

// pg is already a runtime dependency. These are the only driver operations
// the isolated database tests need; no additional type package is required.
const { Client } = require('pg') as {
  Client: new (options: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  }) => TestPgClient;
};

export function testDatabaseConfig() {
  return validateEnvironment(readLocalEnvironment());
}

export async function openTestPostgres(): Promise<TestPgClient> {
  const config = testDatabaseConfig();
  const client = new Client({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USERNAME,
    password: config.DB_PASSWORD,
  });
  await client.connect();
  return client;
}

export function newTestSchema(prefix: 'auth' | 'seed' | 'login'): string {
  return `${prefix}_test_${randomUUID().replaceAll('-', '')}`;
}

function checkedTestSchema(schema: string): string {
  if (!/^(auth|seed|login)_test_[a-f0-9]{32}$/.test(schema)) {
    throw new Error('Invalid test schema');
  }
  return `"${schema}"`;
}

export async function applyAuthBaseline(
  client: TestPgClient,
  schema: string,
): Promise<void> {
  await client.query(`SET LOCAL search_path TO ${checkedTestSchema(schema)}`);
  await client.query(
    readFileSync('prisma/migrations/0_auth_baseline/migration.sql', 'utf8'),
  );
}

export async function createCommittedTestSchema(
  client: TestPgClient,
  schema: string,
): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(`CREATE SCHEMA ${checkedTestSchema(schema)}`);
    await applyAuthBaseline(client, schema);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function dropTestSchema(
  client: TestPgClient,
  schema: string,
): Promise<void> {
  await client.query(`DROP SCHEMA ${checkedTestSchema(schema)} CASCADE`);
  const remaining = await client.query(
    'SELECT 1 FROM pg_namespace WHERE nspname = $1',
    [schema],
  );
  if (remaining.rowCount !== 0) throw new Error('Test schema was not removed');
}
