import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import { prismaConnectionOptions } from './connection-options';
import type { DatabaseEnvironment } from './connection-options';

export function createAuthPrisma(
  config: DatabaseEnvironment,
  schema = 'public',
) {
  const adapter = new PrismaPg(prismaConnectionOptions(config), { schema });
  return new PrismaClient({
    adapter,
    log: [],
    // Sensitive column is only returned when a query explicitly selects it.
    omit: { user: { passwordHash: true } },
  });
}
