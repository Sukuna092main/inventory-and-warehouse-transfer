import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import pg from 'pg';

const tables = [
  'users',
  'user_permissions',
  'user_audit_logs',
  'auth_migrations',
];
const environment = {
  ...parseEnv(readFileSync('.env', 'utf8')),
  ...process.env,
};
const client = new pg.Client({
  host: environment.DB_HOST,
  port: Number(environment.DB_PORT),
  database: environment.DB_NAME,
  user: environment.DB_USERNAME,
  password: environment.DB_PASSWORD,
});
const testSchema = `baseline_test_${randomUUID().replaceAll('-', '')}`;
let stage = 'connect';
let transactionStarted = false;
let verified = false;

async function snapshot(schema) {
  // Deparse regclass defaults and foreign keys relative to each schema.
  await client.query(`SET LOCAL search_path TO "${schema}"`);
  const queries = {
    tables: `SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind='r' AND c.relname=ANY($2) ORDER BY c.relname`,
    columns: `SELECT table_name, column_name, data_type, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_schema=$1 AND table_name=ANY($2) ORDER BY table_name, ordinal_position`,
    constraints: `SELECT t.relname AS table_name, x.conname, x.contype, pg_get_constraintdef(x.oid, true) AS definition FROM pg_constraint x JOIN pg_class t ON t.oid=x.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=$1 AND t.relname=ANY($2) ORDER BY t.relname, x.conname`,
    indexes: `SELECT t.relname AS table_name, i.relname AS index_name, pg_get_indexdef(i.oid) AS definition FROM pg_index x JOIN pg_class t ON t.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=$1 AND t.relname=ANY($2) ORDER BY t.relname, i.relname`,
    triggers: `SELECT t.relname AS table_name, x.tgname, pg_get_triggerdef(x.oid) AS definition FROM pg_trigger x JOIN pg_class t ON t.oid=x.tgrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=$1 AND t.relname=ANY($2) AND NOT x.tgisinternal ORDER BY t.relname, x.tgname`,
    sequences: `SELECT c.relname AS name, s.seqstart::text, s.seqincrement::text, s.seqmin::text, s.seqmax::text FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname='auth_migrations_id_seq'`,
    functions: `SELECT p.proname AS name, l.lanname AS language, pg_get_function_result(p.oid) AS result_type, regexp_replace(trim(p.prosrc), '[[:space:]]+', ' ', 'g') AS body FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname=$1 AND p.proname='reject_user_audit_mutation'`,
  };
  const result = {};
  for (const [name, sql] of Object.entries(queries)) {
    const rows = (
      await client.query(sql, sql.includes('$2') ? [schema, tables] : [schema])
    ).rows;
    result[name] = rows.map((row) => {
      if (row.definition) {
        row.definition = row.definition.replaceAll(`${schema}.`, '<schema>.');
      }
      return row;
    });
  }
  return result;
}

async function expectRejected(sql, params, expectedCode, savepoint) {
  await client.query(`SAVEPOINT ${savepoint}`);
  let actualCode;
  try {
    await client.query(sql, params);
  } catch (error) {
    actualCode = error.code;
  } finally {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
  }
  assert.equal(actualCode, expectedCode);
}

try {
  await client.connect();
  stage = 'transaction';
  await client.query('BEGIN');
  transactionStarted = true;
  const existing = await snapshot('public');
  assert.equal(existing.tables.length, 4);

  stage = 'apply baseline in temporary schema';
  await client.query(`CREATE SCHEMA "${testSchema}"`);
  await client.query(`SET LOCAL search_path TO "${testSchema}"`);
  await client.query(
    readFileSync('prisma/migrations/0_auth_baseline/migration.sql', 'utf8'),
  );

  stage = 'compare schema objects';
  const recreated = await snapshot(testSchema);
  assert.deepEqual(recreated, existing);

  stage = 'check constraints and audit trigger';
  const userId = randomUUID();
  await client.query(
    `INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      'baseline_check',
      'baseline@example.test',
      'synthetic-hash',
      'ADMIN',
    ],
  );
  await client.query(
    `INSERT INTO user_audit_logs (id, user_id, actor_type, action, after_data, correlation_id) VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
    [randomUUID(), userId, 'SYSTEM', 'USER_CREATED', '{}', 'baseline-check'],
  );
  await expectRejected(
    `UPDATE user_audit_logs SET action=action`,
    [],
    '55000',
    'audit_mutation',
  );
  await expectRejected(
    `INSERT INTO users (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
    [
      randomUUID(),
      'invalid_role',
      'invalid@example.test',
      'synthetic-hash',
      'INVALID',
    ],
    '23514',
    'role_check',
  );

  verified = true;
} catch (error) {
  const code =
    typeof error.code === 'string' ? ` (PostgreSQL ${error.code})` : '';
  console.error(`Kiểm tra baseline thất bại tại bước: ${stage}${code}.`);
  process.exitCode = 1;
} finally {
  if (transactionStarted) {
    try {
      await client.query('ROLLBACK');
      const leftover = await client.query(
        'SELECT 1 FROM pg_namespace WHERE nspname = $1',
        [testSchema],
      );
      assert.equal(leftover.rowCount, 0);
    } catch {
      console.error('Không xác nhận được việc dọn schema test.');
      process.exitCode = 1;
    }
  }
  await client.end().catch(() => {});
  if (verified && !process.exitCode) {
    console.log(
      'Baseline Auth khớp database hiện có; CHECK và trigger hoạt động trong schema test.',
    );
  }
}
