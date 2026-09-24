import { randomUUID } from 'node:crypto';
import {
  applyAuthBaseline,
  newTestSchema,
  openTestPostgres,
} from './postgres-test';
import type { TestPgClient } from './postgres-test';

describe('Auth baseline schema on PostgreSQL', () => {
  // The outer transaction rolls back DDL as well as test data.
  const schema = newTestSchema('auth');
  const adminId = randomUUID();
  const staffId = randomUUID();
  const warehouseId = randomUUID();
  const snapshot = {
    username: 'admin_test',
    email: 'admin@example.test',
    role: 'ADMIN',
    assigned_warehouse_id: null,
    status: 'ACTIVE',
    additional_permissions: [],
  };
  let db: TestPgClient;

  const users = `"${schema}".users`;
  const permissions = `"${schema}".user_permissions`;
  const audits = `"${schema}".user_audit_logs`;

  async function expectDbError(
    sql: string,
    params: readonly unknown[],
    code: string,
    constraint?: string,
  ) {
    await db.query('SAVEPOINT expected_error');
    let error: unknown;
    try {
      await db.query(sql, params);
    } catch (caught) {
      error = caught;
    } finally {
      await db.query('ROLLBACK TO SAVEPOINT expected_error');
      await db.query('RELEASE SAVEPOINT expected_error');
    }
    expect(error).toMatchObject({
      code,
      ...(constraint ? { constraint } : {}),
    });
  }

  async function insertAudit(
    action = 'USER_CREATED',
    actorType = 'SYSTEM',
    actorId: string | null = null,
    beforeData: string | null = null,
  ) {
    await db.query(
      `INSERT INTO ${audits} (id, user_id, actor_type, actor_id, action, before_data, after_data, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
      [
        randomUUID(),
        adminId,
        actorType,
        actorId,
        action,
        beforeData,
        JSON.stringify(snapshot),
        'schema-test',
      ],
    );
  }

  beforeAll(async () => {
    db = await openTestPostgres();
    await db.query('BEGIN');
    await db.query(`CREATE SCHEMA "${schema}"`);
    await applyAuthBaseline(db, schema);
  });

  beforeEach(async () => {
    await db.query('SAVEPOINT case_data');
    await db.query(
      `INSERT INTO ${users} (id, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        adminId,
        'admin_test',
        'admin@example.test',
        'synthetic-test-hash',
        'ADMIN',
      ],
    );
    await db.query(
      `INSERT INTO ${users} (id, username, email, password_hash, role, assigned_warehouse_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        staffId,
        'staff_test',
        'staff@example.test',
        'synthetic-test-hash',
        'WAREHOUSE_STAFF',
        warehouseId,
      ],
    );
  });

  afterEach(async () => {
    await db.query('ROLLBACK TO SAVEPOINT case_data');
    await db.query('RELEASE SAVEPOINT case_data');
  });

  afterAll(async () => {
    try {
      if (db) {
        await db.query('ROLLBACK');
        const remaining = await db.query(
          'SELECT 1 FROM pg_namespace WHERE nspname = $1',
          [schema],
        );
        expect(remaining.rowCount).toBe(0);
      }
    } finally {
      if (db) await db.end();
    }
  });

  it('creates users with defaults and explicit password hashes', async () => {
    const result = await db.query<{
      status: string;
      assigned_warehouse_id: string | null;
      password_hash: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT status, assigned_warehouse_id, password_hash, created_at, updated_at FROM ${users} WHERE id=$1`,
      [adminId],
    );
    expect(result.rows[0]).toMatchObject({
      status: 'ACTIVE',
      assigned_warehouse_id: null,
      password_hash: 'synthetic-test-hash',
    });
    expect(result.rows[0].created_at).toBeInstanceOf(Date);
    expect(result.rows[0].updated_at).toBeInstanceOf(Date);
  });

  it.each([
    ['username', 'admin_test', 'uq_users_username'],
    ['email', 'admin@example.test', 'uq_users_email'],
  ])(
    'keeps %s unique even after disabling the existing user',
    async (field, value, constraint) => {
      await db.query(`UPDATE ${users} SET status='INACTIVE' WHERE id=$1`, [
        adminId,
      ]);
      await expectDbError(
        `INSERT INTO ${users} (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
        [
          randomUUID(),
          field === 'username' ? value : 'another_user',
          field === 'email' ? value : 'another@example.test',
          'synthetic-test-hash',
          'ADMIN',
        ],
        '23505',
        constraint,
      );
    },
  );

  it.each([
    ['username', 'Admin', 'ck_users_username'],
    ['username', ' admin ', 'ck_users_username'],
    ['username', 'a@b', 'ck_users_username'],
    ['username', 'ab', 'ck_users_username'],
    ['email', 'Admin@example.test', 'ck_users_email'],
    ['email', ' ', 'ck_users_email'],
    ['email', '\tuser@example.test', 'ck_users_email'],
    ['role', 'UNKNOWN', 'ck_users_role'],
    ['status', 'DELETED', 'ck_users_status'],
    ['password_hash', '\t ', 'ck_users_password_hash'],
  ])(
    'rejects invalid %s (%s) at the database boundary',
    async (column, value, constraint) => {
      await expectDbError(
        `UPDATE ${users} SET ${column}=$1 WHERE id=$2`,
        [value, adminId],
        '23514',
        constraint,
      );
    },
  );

  it.each(['WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'])(
    'requires a warehouse for %s',
    async (role) => {
      await expectDbError(
        `UPDATE ${users} SET role=$1 WHERE id=$2`,
        [role, adminId],
        '23514',
        'ck_users_warehouse',
      );
    },
  );

  it('stores permission references and rejects a duplicate grant', async () => {
    await db.query(
      `INSERT INTO ${permissions} (user_id, permission, granted_by) VALUES ($1, $2, $3)`,
      [staffId, 'SHIP_TRANSFER', adminId],
    );
    const grant = await db.query<{
      recipient: string;
      granter: string;
      granted_at: Date;
    }>(
      `SELECT recipient.id AS recipient, granter.id AS granter, p.granted_at
       FROM ${permissions} p JOIN ${users} recipient ON recipient.id=p.user_id
       JOIN ${users} granter ON granter.id=p.granted_by WHERE p.user_id=$1`,
      [staffId],
    );
    expect(grant.rows[0]).toMatchObject({
      recipient: staffId,
      granter: adminId,
    });
    expect(grant.rows[0].granted_at).toBeInstanceOf(Date);
    await expectDbError(
      `INSERT INTO ${permissions} (user_id, permission, granted_by) VALUES ($1, $2, $3)`,
      [staffId, 'SHIP_TRANSFER', adminId],
      '23505',
      'pk_user_permissions',
    );
  });

  it.each([
    ['unknown permission', staffId, 'UNKNOWN', adminId, '23514'],
    ['missing recipient', randomUUID(), 'SHIP_TRANSFER', adminId, '23503'],
    ['missing granter', staffId, 'SHIP_TRANSFER', randomUUID(), '23503'],
  ])('rejects %s', async (_label, userId, permission, granter, code) => {
    await expectDbError(
      `INSERT INTO ${permissions} (user_id, permission, granted_by) VALUES ($1, $2, $3)`,
      [userId, permission, granter],
      code,
    );
  });

  it('stores SYSTEM creation and USER update audit snapshots', async () => {
    await insertAudit();
    await insertAudit(
      'USER_UPDATED',
      'USER',
      adminId,
      JSON.stringify(snapshot),
    );
    const history = await db.query<{
      actor_type: string;
      actor_id: string | null;
      before_data: unknown;
      after_data: unknown;
      created_at: Date;
    }>(
      `SELECT actor_type, actor_id, before_data, after_data, created_at FROM ${audits} ORDER BY created_at`,
      [],
    );
    expect(history.rows).toHaveLength(2);
    expect(history.rows[0]).toMatchObject({
      actor_type: 'SYSTEM',
      actor_id: null,
      before_data: null,
      after_data: snapshot,
    });
    expect(history.rows[1]).toMatchObject({
      actor_type: 'USER',
      actor_id: adminId,
      before_data: snapshot,
      after_data: snapshot,
    });
    expect(history.rows[0].created_at).toBeInstanceOf(Date);
  });

  it.each([
    [
      'USER without actor',
      'USER',
      null,
      'USER_CREATED',
      null,
      '{}',
      'test',
      '23514',
    ],
    [
      'SYSTEM with actor',
      'SYSTEM',
      adminId,
      'USER_CREATED',
      null,
      '{}',
      'test',
      '23514',
    ],
    [
      'SYSTEM updating',
      'SYSTEM',
      null,
      'USER_UPDATED',
      '{}',
      '{}',
      'test',
      '23514',
    ],
    [
      'unknown actor type',
      'UNKNOWN',
      null,
      'USER_CREATED',
      null,
      '{}',
      'test',
      '23514',
    ],
    ['unknown action', 'USER', adminId, 'UNKNOWN', '{}', '{}', 'test', '23514'],
    [
      'missing actor reference',
      'USER',
      randomUUID(),
      'USER_CREATED',
      null,
      '{}',
      'test',
      '23503',
    ],
    [
      'creation with JSON null before',
      'SYSTEM',
      null,
      'USER_CREATED',
      'null',
      '{}',
      'test',
      '23514',
    ],
    [
      'update without before',
      'USER',
      adminId,
      'USER_UPDATED',
      null,
      '{}',
      'test',
      '23514',
    ],
    [
      'array before',
      'USER',
      adminId,
      'USER_UPDATED',
      '[]',
      '{}',
      'test',
      '23514',
    ],
    [
      'array after',
      'SYSTEM',
      null,
      'USER_CREATED',
      null,
      '[]',
      'test',
      '23514',
    ],
    [
      'JSON null after',
      'SYSTEM',
      null,
      'USER_CREATED',
      null,
      'null',
      'test',
      '23514',
    ],
    [
      'SQL NULL after',
      'SYSTEM',
      null,
      'USER_CREATED',
      null,
      null,
      'test',
      '23502',
    ],
    [
      'blank correlation ID',
      'SYSTEM',
      null,
      'USER_CREATED',
      null,
      '{}',
      '\t ',
      '23514',
    ],
  ])(
    'rejects audit: %s',
    async (
      _label,
      actorType,
      actorId,
      action,
      before,
      after,
      correlation,
      code,
    ) => {
      await expectDbError(
        `INSERT INTO ${audits} (id, user_id, actor_type, actor_id, action, before_data, after_data, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)`,
        [
          randomUUID(),
          adminId,
          actorType,
          actorId,
          action,
          before,
          after,
          correlation,
        ],
        code,
      );
    },
  );

  it.each(['UPDATE', 'DELETE', 'TRUNCATE'])(
    'blocks %s of audit history',
    async (operation) => {
      await insertAudit();
      const sql =
        operation === 'UPDATE'
          ? `UPDATE ${audits} SET correlation_id='changed'`
          : operation === 'DELETE'
            ? `DELETE FROM ${audits}`
            : `TRUNCATE ${audits}`;
      await expectDbError(sql, [], '55000');
    },
  );

  it('preserves users referenced by audit history', async () => {
    await insertAudit();
    await expectDbError(`DELETE FROM ${users} WHERE id=$1`, [adminId], '23503');
  });

  it('rolls back the user write when the audit insert fails', async () => {
    await db.query('SAVEPOINT user_change');
    await db.query(`UPDATE ${users} SET status='INACTIVE' WHERE id=$1`, [
      adminId,
    ]);
    await expectDbError(
      `INSERT INTO ${audits} (id, user_id, actor_type, action, after_data, correlation_id)
       VALUES ($1, $2, 'SYSTEM', 'USER_CREATED', '{}'::jsonb, '')`,
      [randomUUID(), adminId],
      '23514',
    );
    await db.query('ROLLBACK TO SAVEPOINT user_change');
    await db.query('RELEASE SAVEPOINT user_change');
    const result = await db.query<{ status: string }>(
      `SELECT status FROM ${users} WHERE id=$1`,
      [adminId],
    );
    expect(result.rows[0].status).toBe('ACTIVE');
  });
});
