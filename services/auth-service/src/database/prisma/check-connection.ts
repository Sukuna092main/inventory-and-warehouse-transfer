import { readLocalEnvironment } from '../../config/local-environment';
import { validateEnvironment } from '../../config/environment';
import { createAuthPrisma } from './prisma-client';

async function main(): Promise<void> {
  let client: ReturnType<typeof createAuthPrisma> | undefined;
  try {
    client = createAuthPrisma(validateEnvironment(readLocalEnvironment()));
    await client.$connect();
    const result = await client.$transaction(async (transaction) => {
      // PostgreSQL enforces that this verification cannot change data or schema.
      await transaction.$executeRaw`SET TRANSACTION READ ONLY`;
      const [identity] = await transaction.$queryRaw<Array<{ database: string; username: string }>>`
        SELECT current_database() AS database, current_user AS username
      `;
      const activeAdmins = await transaction.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
      const seedAuditLogs = await transaction.userAuditLog.count({
        where: { actorType: 'SYSTEM', action: 'USER_CREATED', correlationId: { startsWith: 'seed-admin:' } },
      });
      const permissions = await transaction.userPermission.count();
      const migrations = await transaction.legacyAuthMigration.findMany({ select: { name: true }, orderBy: { id: 'asc' } });
      return { ...identity, activeAdmins, seedAuditLogs, permissions, migrations };
    });
    console.log('Prisma kết nối thành công (chỉ đọc):');
    console.log(JSON.stringify(result, null, 2));
  } catch {
    // Never log a connection URL or Prisma error containing query parameters.
    console.error('Kiểm tra Prisma thất bại. Kiểm tra PostgreSQL, cấu hình DB_* và client đã generate.');
    process.exitCode = 1;
  } finally {
    if (client) await client.$disconnect();
  }
}

void main();
