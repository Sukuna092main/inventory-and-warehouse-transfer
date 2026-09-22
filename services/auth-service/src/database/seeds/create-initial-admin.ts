import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { hashPassword } from '../../auth/password';
import { User } from '../../users/entities/user.entity';
import { UserAuditLog } from '../../users/entities/user-audit-log.entity';
import { readSeedAdminConfig, SeedAdminError } from './seed-admin-config';

export async function createInitialAdmin(
  manager: EntityManager,
  env: Record<string, unknown>,
): Promise<'created' | 'admin_exists'> {
  const config = readSeedAdminConfig(env);
  // Hash before taking a write lock. Never log this value or SQL parameters.
  const passwordHash = await hashPassword(config.password);

  return manager.transaction('READ COMMITTED', async (transaction) => {
    const metadata = transaction.connection.getMetadata(User);
    const escape = (name: string) => transaction.connection.driver.escape(name);
    const table = `${escape(metadata.schema ?? 'public')}.${escape(metadata.tableName)}`;
    await transaction.query("SET LOCAL lock_timeout = '5s'");
    // A row lock cannot protect an empty table. This also serializes two seeds.
    await transaction.query(`LOCK TABLE ${table} IN SHARE ROW EXCLUSIVE MODE`);
    const users = transaction.getRepository(User);
    if (await users.existsBy({ role: 'ADMIN' })) return 'admin_exists';

    if (
      await users.existsBy([
        { username: config.username },
        { email: config.email },
      ])
    ) {
      throw new SeedAdminError(
        'Username hoặc email seed đã thuộc tài khoản khác; không thay đổi role hoặc mật khẩu của tài khoản đó.',
      );
    }

    const id = randomUUID();
    await users.insert({
      id,
      username: config.username,
      email: config.email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      assignedWarehouseId: null,
    });
    await transaction.insert(UserAuditLog, {
      id: randomUUID(),
      userId: id,
      actorType: 'SYSTEM',
      actorId: null,
      action: 'USER_CREATED',
      beforeData: null,
      afterData: {
        username: config.username,
        email: config.email,
        role: 'ADMIN',
        assigned_warehouse_id: null,
        status: 'ACTIVE',
        additional_permissions: [],
      },
      correlationId: `seed-admin:${randomUUID()}`,
    });
    return 'created';
  });
}
