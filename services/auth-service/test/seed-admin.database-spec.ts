import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import configuredDataSource from '../src/database/data-source';
import { createInitialAdmin } from '../src/database/seeds/create-initial-admin';
import { verifyPassword } from '../src/auth/password';
import { User } from '../src/users/entities/user.entity';
import { UserAuditLog } from '../src/users/entities/user-audit-log.entity';
import { UserPermission } from '../src/users/entities/user-permission.entity';

describe('Seed Admin on PostgreSQL', () => {
  const env = {
    SEED_ADMIN_USERNAME: ' Admin_Test ',
    SEED_ADMIN_EMAIL: ' Admin@Example.Test ',
    SEED_ADMIN_PASSWORD: 'mat-khau-seed-test-rieng',
  };
  let db: DataSource;
  let schema: string;
  let created: boolean;

  beforeEach(async () => {
    // A committed, isolated schema lets two real connections test concurrent seeds.
    // Cleanup only ever drops this exact random schema, never public or auth_db.
    schema = `seed_test_${randomUUID().replaceAll('-', '')}`;
    created = false;
    const options = configuredDataSource.options;
    if (options.type !== 'postgres') throw new Error('PostgreSQL required');
    db = new DataSource({ ...options, schema, logging: false });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await db.runMigrations();
  });

  afterEach(async () => {
    try {
      if (created && db?.isInitialized) {
        if (!/^seed_test_[a-f0-9]{32}$/.test(schema))
          throw new Error('Invalid test schema');
        await db.query(`DROP SCHEMA "${schema}" CASCADE`);
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

  async function adminWithHash() {
    return db
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.role = :role', { role: 'ADMIN' })
      .getOneOrFail();
  }

  it('creates an ACTIVE admin, a verifiable hash and exactly one SYSTEM audit', async () => {
    expect(await createInitialAdmin(db.manager, env)).toBe('created');
    const admin = await adminWithHash();
    expect(admin).toMatchObject({
      username: 'admin_test',
      email: 'admin@example.test',
      status: 'ACTIVE',
      assignedWarehouseId: null,
    });
    expect(
      await verifyPassword(env.SEED_ADMIN_PASSWORD, admin.passwordHash),
    ).toBe(true);
    const logs = await db.manager.find(UserAuditLog);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      userId: admin.id,
      actorType: 'SYSTEM',
      actorId: null,
      action: 'USER_CREATED',
      beforeData: null,
      afterData: {
        username: 'admin_test',
        email: 'admin@example.test',
        role: 'ADMIN',
        status: 'ACTIVE',
        assigned_warehouse_id: null,
        additional_permissions: [],
      },
    });
    expect(Object.keys(logs[0].afterData).sort()).toEqual([
      'additional_permissions',
      'assigned_warehouse_id',
      'email',
      'role',
      'status',
      'username',
    ]);
    expect(JSON.stringify(logs)).not.toContain(env.SEED_ADMIN_PASSWORD);
    expect(JSON.stringify(logs)).not.toContain(admin.passwordHash);
    expect(await db.manager.count(UserPermission)).toBe(0);
  });

  it.each(['ACTIVE', 'INACTIVE'] as const)(
    'skips an existing %s admin without changing password or audit',
    async (status) => {
      await createInitialAdmin(db.manager, env);
      const before = await adminWithHash();
      await db.manager.update(User, before.id, { status });
      expect(
        await createInitialAdmin(db.manager, {
          ...env,
          SEED_ADMIN_PASSWORD: 'mot-mat-khau-moi-khac',
        }),
      ).toBe('admin_exists');
      const after = await adminWithHash();
      expect(after.passwordHash).toBe(before.passwordHash);
      expect(after.status).toBe(status);
      expect(after.updatedAt).toEqual(before.updatedAt);
      expect(await db.manager.count(User)).toBe(1);
      expect(await db.manager.count(UserAuditLog)).toBe(1);
    },
  );

  it('does not create another admin when the configuration uses a different identity', async () => {
    await createInitialAdmin(db.manager, env);
    expect(
      await createInitialAdmin(db.manager, {
        ...env,
        SEED_ADMIN_USERNAME: 'other_admin',
        SEED_ADMIN_EMAIL: 'other@example.test',
      }),
    ).toBe('admin_exists');
    expect(await db.manager.count(User)).toBe(1);
    expect(await db.manager.count(UserAuditLog)).toBe(1);
  });

  it.each(['username', 'email'])(
    'refuses to promote an existing staff account with the seed %s',
    async (field) => {
      const id = randomUUID();
      await db.manager.insert(User, {
        id,
        username: field === 'username' ? 'admin_test' : 'staff_test',
        email: field === 'email' ? 'admin@example.test' : 'staff@example.test',
        passwordHash: 'synthetic-staff-hash',
        role: 'WAREHOUSE_STAFF',
        assignedWarehouseId: randomUUID(),
      });
      await expect(createInitialAdmin(db.manager, env)).rejects.toThrow(
        'tài khoản khác',
      );
      expect((await db.manager.findOneByOrFail(User, { id })).role).toBe(
        'WAREHOUSE_STAFF',
      );
      expect(await db.manager.count(User)).toBe(1);
      expect(await db.manager.count(UserAuditLog)).toBe(0);
    },
  );

  it('rolls back the admin if the audit write fails', async () => {
    await db.query(
      `ALTER TABLE "${schema}".user_audit_logs ADD CONSTRAINT reject_test_audit CHECK (false)`,
    );
    await expect(createInitialAdmin(db.manager, env)).rejects.toMatchObject({
      driverError: { code: '23514' },
    });
    expect(await db.manager.count(User)).toBe(0);
    expect(await db.manager.count(UserAuditLog)).toBe(0);
  });

  it('serializes concurrent seeds with different usernames into one admin and audit', async () => {
    const results = await Promise.allSettled([
      createInitialAdmin(db.manager, env),
      createInitialAdmin(db.manager, {
        ...env,
        SEED_ADMIN_USERNAME: 'other_admin',
        SEED_ADMIN_EMAIL: 'other@example.test',
      }),
    ]);
    expect(results.every((result) => result.status === 'fulfilled')).toBe(true);
    expect(
      results
        .map((result) =>
          result.status === 'fulfilled' ? result.value : 'failed',
        )
        .sort(),
    ).toEqual(['admin_exists', 'created']);
    expect(await db.manager.count(User)).toBe(1);
    expect(await db.manager.count(UserAuditLog)).toBe(1);
  });
});
