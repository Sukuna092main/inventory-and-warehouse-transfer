import { randomUUID } from 'node:crypto';
import { DataSource, MigrationExecutor } from 'typeorm';
import type { QueryRunner } from 'typeorm';
import configuredDataSource from '../src/database/data-source';
import { User } from '../src/users/entities/user.entity';
import { UserPermission } from '../src/users/entities/user-permission.entity';
import { UserAuditLog } from '../src/users/entities/user-audit-log.entity';
import type { UserAuditSnapshot } from '../src/users/entities/user.types';

describe('Auth schema on PostgreSQL', () => {
  // All DDL and fixtures live in one uncommitted transaction, in a unique schema.
  // Even an interrupted process cannot leave test tables in public.
  const schema = `auth_test_${randomUUID().replaceAll('-', '')}`;
  const adminId = randomUUID();
  const staffId = randomUUID();
  const warehouseId = randomUUID();
  const snapshot: UserAuditSnapshot = {
    username: 'admin_test',
    email: 'admin@example.test',
    role: 'ADMIN',
    assigned_warehouse_id: null,
    status: 'ACTIVE',
    additional_permissions: [],
  };
  let db: DataSource;
  let runner: QueryRunner;
  let executor: MigrationExecutor;

  beforeAll(async () => {
    const options = configuredDataSource.options;
    if (options.type !== 'postgres') throw new Error('PostgreSQL required');
    db = new DataSource({ ...options, schema });
    await db.initialize();
    runner = db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    await runner.query(`CREATE SCHEMA "${schema}"`);
    executor = new MigrationExecutor(db, runner);
    expect(await executor.executePendingMigrations()).toHaveLength(1);
  });

  beforeEach(async () => {
    await runner.startTransaction(); // Savepoint: every case gets fresh fixtures.
    await runner.manager.insert(User, [
      {
        id: adminId,
        username: 'admin_test',
        email: 'admin@example.test',
        passwordHash: 'synthetic-test-hash',
        role: 'ADMIN',
      },
      {
        id: staffId,
        username: 'staff_test',
        email: 'staff@example.test',
        passwordHash: 'synthetic-test-hash',
        role: 'WAREHOUSE_STAFF',
        assignedWarehouseId: warehouseId,
      },
    ]);
  });

  afterEach(async () => {
    if (runner?.isTransactionActive) await runner.rollbackTransaction();
  });

  afterAll(async () => {
    try {
      if (runner && !runner.isReleased) {
        while (runner.isTransactionActive) await runner.rollbackTransaction();
        await runner.release();
      }
      if (db?.isInitialized) {
        const remaining: unknown[] = await db.query(
          'SELECT 1 FROM pg_namespace WHERE nspname = $1',
          [schema],
        );
        expect(remaining).toHaveLength(0);
      }
    } finally {
      if (db?.isInitialized) await db.destroy();
    }
  });

  const newUser = () => ({
    id: randomUUID(),
    username: 'another_user',
    email: 'another@example.test',
    passwordHash: 'synthetic-test-hash',
    role: 'ADMIN' as const,
  });

  const creationAudit = () => ({
    id: randomUUID(),
    userId: adminId,
    actorType: 'SYSTEM' as const,
    actorId: null,
    action: 'USER_CREATED' as const,
    beforeData: null,
    afterData: snapshot,
    correlationId: 'schema-test',
  });

  it('maps users, defaults and explicitly selected password hashes', async () => {
    const users = runner.manager.getRepository(User);
    const admin = await users.findOneByOrFail({ id: adminId });
    expect(admin).toMatchObject({
      role: 'ADMIN',
      status: 'ACTIVE',
      assignedWarehouseId: null,
    });
    expect(admin.createdAt).toBeInstanceOf(Date);
    expect(admin.updatedAt).toBeInstanceOf(Date);
    expect(admin.passwordHash).toBeUndefined();
    const forLogin = await users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: adminId })
      .getOneOrFail();
    expect(forLogin.passwordHash).toBe('synthetic-test-hash');
  });

  it.each([
    ['username', { username: 'admin_test' }, 'uq_users_username'],
    ['email', { email: 'admin@example.test' }, 'uq_users_email'],
  ])(
    'keeps %s unique even after disabling the existing user',
    async (_field, duplicate, constraint) => {
      await runner.manager.update(User, adminId, { status: 'INACTIVE' });
      await expect(
        runner.manager.insert(User, { ...newUser(), ...duplicate }),
      ).rejects.toMatchObject({ driverError: { code: '23505', constraint } });
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
      await expect(
        runner.query(
          `UPDATE "${schema}".users SET ${column} = $1 WHERE id = $2`,
          [value, adminId],
        ),
      ).rejects.toMatchObject({ driverError: { code: '23514', constraint } });
    },
  );

  it.each(['WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF'])(
    'requires a warehouse for %s',
    async (role) => {
      await expect(
        runner.query(`UPDATE "${schema}".users SET role = $1 WHERE id = $2`, [
          role,
          adminId,
        ]),
      ).rejects.toMatchObject({
        driverError: { code: '23514', constraint: 'ck_users_warehouse' },
      });
    },
  );

  it('maps permission references and rejects a duplicate grant', async () => {
    const permission = {
      userId: staffId,
      permission: 'SHIP_TRANSFER' as const,
      grantedBy: adminId,
    };
    await runner.manager.insert(UserPermission, permission);
    const grant = await runner.manager.findOneOrFail(UserPermission, {
      where: { userId: staffId, permission: 'SHIP_TRANSFER' },
      relations: { user: true, granter: true },
    });
    expect(grant.user.id).toBe(staffId);
    expect(grant.granter.id).toBe(adminId);
    expect(grant.grantedAt).toBeInstanceOf(Date);
    await expect(
      runner.manager.insert(UserPermission, permission),
    ).rejects.toMatchObject({
      driverError: { code: '23505', constraint: 'pk_user_permissions' },
    });
  });

  it.each([
    ['unknown permission', staffId, 'UNKNOWN', adminId, '23514'],
    ['missing recipient', randomUUID(), 'SHIP_TRANSFER', adminId, '23503'],
    ['missing granter', staffId, 'SHIP_TRANSFER', randomUUID(), '23503'],
  ])('rejects %s', async (_label, userId, permission, granter, code) => {
    await expect(
      runner.query(
        `INSERT INTO "${schema}".user_permissions (user_id, permission, granted_by) VALUES ($1, $2, $3)`,
        [userId, permission, granter],
      ),
    ).rejects.toMatchObject({ driverError: { code } });
  });

  it('maps SYSTEM creation and USER update audit snapshots and references', async () => {
    const creation = creationAudit();
    await runner.manager.insert(UserAuditLog, creation);
    const saved = await runner.manager.findOneByOrFail(UserAuditLog, {
      id: creation.id,
    });
    expect(saved).toMatchObject({
      actorType: 'SYSTEM',
      actorId: null,
      beforeData: null,
      afterData: snapshot,
    });
    expect(saved.createdAt).toBeInstanceOf(Date);
    const update = {
      ...creationAudit(),
      actorType: 'USER' as const,
      actorId: adminId,
      action: 'USER_UPDATED' as const,
      beforeData: snapshot,
    };
    await runner.manager.insert(UserAuditLog, update);
    const history = await runner.manager.findOneOrFail(UserAuditLog, {
      where: { id: update.id },
      relations: { user: true, actor: true },
    });
    expect(history.user.id).toBe(adminId);
    expect(history.actor?.id).toBe(adminId);
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
      await expect(
        runner.query(
          `INSERT INTO "${schema}".user_audit_logs
      (id, user_id, actor_type, actor_id, action, before_data, after_data, correlation_id)
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
        ),
      ).rejects.toMatchObject({ driverError: { code } });
    },
  );

  it.each(['UPDATE', 'DELETE', 'TRUNCATE'])(
    'blocks %s of audit history',
    async (operation) => {
      await runner.manager.insert(UserAuditLog, creationAudit());
      const sql =
        operation === 'UPDATE'
          ? `UPDATE "${schema}".user_audit_logs SET correlation_id = 'changed'`
          : operation === 'DELETE'
            ? `DELETE FROM "${schema}".user_audit_logs`
            : `TRUNCATE "${schema}".user_audit_logs`;
      await expect(runner.query(sql)).rejects.toMatchObject({
        driverError: { code: '55000' },
      });
    },
  );

  it('preserves users referenced by audit history', async () => {
    await runner.manager.insert(UserAuditLog, creationAudit());
    await expect(runner.manager.delete(User, adminId)).rejects.toMatchObject({
      driverError: { code: '23503' },
    });
  });

  it('rolls back the user write when the audit insert fails', async () => {
    await runner.startTransaction();
    try {
      await runner.manager.update(User, adminId, { status: 'INACTIVE' });
      await expect(
        runner.manager.insert(UserAuditLog, {
          ...creationAudit(),
          correlationId: '',
        }),
      ).rejects.toMatchObject({ driverError: { code: '23514' } });
    } finally {
      await runner.rollbackTransaction();
    }
    expect(
      (await runner.manager.findOneByOrFail(User, { id: adminId })).status,
    ).toBe('ACTIVE');
  });

  it('records a migration once and supports down/up in the isolated schema', async () => {
    expect(await executor.executePendingMigrations()).toHaveLength(0);
    await executor.undoLastMigration();
    const remaining: unknown[] = await runner.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name <> $2',
      [schema, 'auth_migrations'],
    );
    expect(remaining).toHaveLength(0);
    expect(await executor.executePendingMigrations()).toHaveLength(1);
    expect(await executor.executePendingMigrations()).toHaveLength(0);
    expect(await runner.manager.count(User)).toBe(0);
  });
});
