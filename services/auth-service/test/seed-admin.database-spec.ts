import { randomUUID } from 'node:crypto';
import { createInitialAdmin } from '../src/database/seeds/create-initial-admin';
import { verifyPassword } from '../src/auth/password';
import { createAuthPrisma } from '../src/database/prisma/prisma-client';
import type { PrismaClient } from '../src/generated/prisma/client';
import {
  createCommittedTestSchema,
  dropTestSchema,
  newTestSchema,
  openTestPostgres,
  testDatabaseConfig,
} from './postgres-test';
import type { TestPgClient } from './postgres-test';

describe('Seed Admin on PostgreSQL', () => {
  const env = {
    SEED_ADMIN_USERNAME: ' Admin_Test ',
    SEED_ADMIN_EMAIL: ' Admin@Example.Test ',
    SEED_ADMIN_PASSWORD: 'mat-khau-seed-test-rieng',
  };
  let db: TestPgClient;
  let prisma: PrismaClient;
  let schema: string;
  let created: boolean;

  beforeEach(async () => {
    // A committed, isolated schema lets two real connections test concurrent seeds.
    // Cleanup only ever drops this exact random schema, never public or auth_db.
    schema = newTestSchema('seed');
    created = false;
    db = await openTestPostgres();
    await createCommittedTestSchema(db, schema);
    created = true;
    prisma = createAuthPrisma(testDatabaseConfig(), schema);
  });

  afterEach(async () => {
    try {
      if (prisma) await prisma.$disconnect();
      if (created && db) await dropTestSchema(db, schema);
    } finally {
      if (db) await db.end();
    }
  });

  async function adminWithHash() {
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        status: true,
        assignedWarehouseId: true,
        updatedAt: true,
      },
    });
    if (!admin) throw new Error('Test admin is missing');
    return admin;
  }

  function seedAdmin(values = env) {
    return createInitialAdmin(prisma, values, schema);
  }

  it('creates an ACTIVE admin, a verifiable hash and exactly one SYSTEM audit', async () => {
    expect(await seedAdmin()).toBe('created');
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
    const logs = await prisma.userAuditLog.findMany();
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
    expect(await prisma.userPermission.count()).toBe(0);
  });

  it.each(['ACTIVE', 'INACTIVE'] as const)(
    'skips an existing %s admin without changing password or audit',
    async (status) => {
      await seedAdmin();
      const before = await adminWithHash();
      await prisma.user.update({ where: { id: before.id }, data: { status } });
      expect(
        await seedAdmin({
          ...env,
          SEED_ADMIN_PASSWORD: 'mot-mat-khau-moi-khac',
        }),
      ).toBe('admin_exists');
      const after = await adminWithHash();
      expect(after.passwordHash).toBe(before.passwordHash);
      expect(after.status).toBe(status);
      expect(after.updatedAt).toEqual(before.updatedAt);
      expect(await prisma.user.count()).toBe(1);
      expect(await prisma.userAuditLog.count()).toBe(1);
    },
  );

  it('does not create another admin when the configuration uses a different identity', async () => {
    await seedAdmin();
    expect(
      await seedAdmin({
        ...env,
        SEED_ADMIN_USERNAME: 'other_admin',
        SEED_ADMIN_EMAIL: 'other@example.test',
      }),
    ).toBe('admin_exists');
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.userAuditLog.count()).toBe(1);
  });

  it.each(['username', 'email'])(
    'refuses to promote an existing staff account with the seed %s',
    async (field) => {
      const id = randomUUID();
      await prisma.user.create({
        data: {
          id,
          username: field === 'username' ? 'admin_test' : 'staff_test',
          email:
            field === 'email' ? 'admin@example.test' : 'staff@example.test',
          passwordHash: 'synthetic-staff-hash',
          role: 'WAREHOUSE_STAFF',
          assignedWarehouseId: randomUUID(),
        },
      });
      await expect(seedAdmin()).rejects.toThrow('tài khoản khác');
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id } })).role,
      ).toBe('WAREHOUSE_STAFF');
      expect(await prisma.user.count()).toBe(1);
      expect(await prisma.userAuditLog.count()).toBe(0);
    },
  );

  it('rolls back the admin if the audit write fails', async () => {
    await db.query(
      `ALTER TABLE "${schema}".user_audit_logs ADD CONSTRAINT reject_test_audit CHECK (false)`,
    );
    await expect(seedAdmin()).rejects.toThrow();
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.userAuditLog.count()).toBe(0);
  });

  it('serializes concurrent seeds with different usernames into one admin and audit', async () => {
    const results = await Promise.allSettled([
      seedAdmin(),
      seedAdmin({
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
    expect(await prisma.user.count()).toBe(1);
    expect(await prisma.userAuditLog.count()).toBe(1);
  });
});
