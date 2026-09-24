import { randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client';
import { hashPassword } from '../../auth/password';
import type { createAuthPrisma } from '../prisma/prisma-client';
import { readSeedAdminConfig, SeedAdminError } from './seed-admin-config';

export async function createInitialAdmin(
  prisma: ReturnType<typeof createAuthPrisma>,
  env: Record<string, unknown>,
  schema = 'public',
): Promise<'created' | 'admin_exists'> {
  const config = readSeedAdminConfig(env);
  // PostgreSQL identifiers cannot be query parameters; validate before quoting.
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(schema)) {
    throw new SeedAdminError('Tên schema seed không hợp lệ.');
  }
  // Hash before taking a write lock. Never log this value or SQL parameters.
  const passwordHash = await hashPassword(config.password);

  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`SET LOCAL lock_timeout = '5s'`;
      // A row lock cannot protect an empty table. This also serializes two seeds.
      await transaction.$executeRawUnsafe(
        `LOCK TABLE "${schema}"."users" IN SHARE ROW EXCLUSIVE MODE`,
      );
      if (
        await transaction.user.findFirst({
          where: { role: 'ADMIN' },
          select: { id: true },
        })
      ) {
        return 'admin_exists';
      }

      if (
        await transaction.user.findFirst({
          where: {
            OR: [{ username: config.username }, { email: config.email }],
          },
          select: { id: true },
        })
      ) {
        throw new SeedAdminError(
          'Username hoặc email seed đã thuộc tài khoản khác; không thay đổi role hoặc mật khẩu của tài khoản đó.',
        );
      }

      const id = randomUUID();
      await transaction.user.create({
        data: {
          id,
          username: config.username,
          email: config.email,
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
          assignedWarehouseId: null,
        },
        select: { id: true },
      });
      await transaction.userAuditLog.create({
        data: {
          id: randomUUID(),
          userId: id,
          actorType: 'SYSTEM',
          actorId: null,
          action: 'USER_CREATED',
          beforeData: Prisma.DbNull,
          afterData: {
            username: config.username,
            email: config.email,
            role: 'ADMIN',
            assigned_warehouse_id: null,
            status: 'ACTIVE',
            additional_permissions: [],
          },
          correlationId: `seed-admin:${randomUUID()}`,
        },
        select: { id: true },
      });
      return 'created';
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10000,
      timeout: 15000,
    },
  );
}
