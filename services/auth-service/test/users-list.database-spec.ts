import { randomBytes, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { jwtOptions } from '../src/auth/jwt.config';
import { hashPassword } from '../src/auth/password';
import { configureApp } from '../src/configure-app';
import { AuthPrismaService } from '../src/database/prisma/auth-prisma.service';
import { createAuthPrisma } from '../src/database/prisma/prisma-client';
import { UsersModule } from '../src/users/users.module';
import {
  createCommittedTestSchema,
  dropTestSchema,
  newTestSchema,
  openTestPostgres,
  testDatabaseConfig,
} from './postgres-test';
import type { TestPgClient } from './postgres-test';

type ListBody = {
  items: {
    id: string;
    additionalPermissions: string[];
  }[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
};

describe('GET /api/users with PostgreSQL', () => {
  // Dùng prefix đã được helper hiện tại cho phép.
  const schema = newTestSchema('login');
  const secret = randomBytes(32).toString('hex');
  const jwt = new JwtService(jwtOptions(secret));
  const warehouseId = randomUUID();

  const adminId = '10000000-0000-4000-8000-000000000001';
  const managerId = '10000000-0000-4000-8000-000000000002';
  const staffId = '10000000-0000-4000-8000-000000000003';
  const inactiveId = '10000000-0000-4000-8000-000000000004';

  let db: TestPgClient;
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createAuthPrisma>;
  let adminToken: string;
  let created = false;

  function list(token = adminToken, query = '') {
    return request(app.getHttpServer())
      .get(`/api/users${query ? `?${query}` : ''}`)
      .set('Authorization', `Bearer ${token}`);
  }

  beforeAll(async () => {
    db = await openTestPostgres();
    await createCommittedTestSchema(db, schema);
    created = true;

    prisma = createAuthPrisma(testDatabaseConfig(), schema);

    const passwordHash = await hashPassword('fixture-password-only');
    const createdAt = new Date('2026-10-11T03:00:00.000Z');

    await prisma.user.createMany({
      data: [
        {
          id: adminId,
          username: 'listadmin',
          email: 'admin@example.test',
          passwordHash,
          role: 'ADMIN',
          createdAt,
        },
        {
          id: managerId,
          username: 'listmanager',
          email: 'manager@example.test',
          passwordHash,
          role: 'WAREHOUSE_MANAGER',
          assignedWarehouseId: warehouseId,
          createdAt,
        },
        {
          id: staffId,
          username: 'staff_one',
          email: 'one@example.test',
          passwordHash,
          role: 'WAREHOUSE_STAFF',
          assignedWarehouseId: warehouseId,
          createdAt,
        },
        {
          id: inactiveId,
          username: 'disabledstaff',
          email: 'disabled@example.test',
          passwordHash,
          role: 'WAREHOUSE_STAFF',
          assignedWarehouseId: warehouseId,
          status: 'INACTIVE',
          createdAt,
        },
      ],
    });

    await prisma.userPermission.createMany({
      data: [
        {
          userId: staffId,
          permission: 'VIEW_OTHER_INVENTORY',
          grantedBy: adminId,
        },
        {
          userId: staffId,
          permission: 'RECEIVE_TRANSFER',
          grantedBy: adminId,
        },
      ],
    });

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [() => ({ JWT_SECRET: secret })],
        }),
        UsersModule,
      ],
    })
      .overrideProvider(AuthPrismaService)
      .useValue({ client: prisma })
      .compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.init();

    adminToken = await jwt.signAsync({ sub: adminId });
  });

  afterAll(async () => {
    try {
      if (app) await app.close();
      if (prisma) await prisma.$disconnect();
      if (created && db) await dropTestSchema(db, schema);
    } finally {
      if (db) await db.end();
    }
  });

  it('returns default pagination and only public account fields', async () => {
    const response = await list().expect(200);
    const body = response.body as ListBody;

    expect(body).toMatchObject({
      page: 0,
      size: 20,
      total: 4,
      totalPages: 1,
    });
    expect(body.items).toHaveLength(4);
    expect(response.headers['cache-control']).toBe('no-store');

    for (const item of body.items) {
      expect(Object.keys(item).sort()).toEqual([
        'additionalPermissions',
        'assignedWarehouseId',
        'createdAt',
        'email',
        'id',
        'role',
        'status',
        'updatedAt',
        'username',
      ]);
    }

    expect(
      body.items.find((item) => item.id === staffId)?.additionalPermissions,
    ).toEqual(['RECEIVE_TRANSFER', 'VIEW_OTHER_INVENTORY']);
  });

  it('uses ID as a stable tie-breaker across pages', async () => {
    const first = await list(adminToken, 'page=0&size=2').expect(200);
    const second = await list(adminToken, 'page=1&size=2').expect(200);

    const firstBody = first.body as ListBody;
    const secondBody = second.body as ListBody;

    expect(firstBody.items.map((item) => item.id)).toEqual([
      inactiveId,
      staffId,
    ]);
    expect(secondBody.items.map((item) => item.id)).toEqual([
      managerId,
      adminId,
    ]);
    expect(firstBody.totalPages).toBe(2);
    expect(secondBody.total).toBe(4);
  });

  it('trims search and matches email without case sensitivity', async () => {
    const response = await list(
      adminToken,
      'search=%20ONE%40EXAMPLE.TEST%20',
    ).expect(200);

    const body = response.body as ListBody;
    expect(body.total).toBe(1);
    expect(body.items.map((item) => item.id)).toEqual([staffId]);
  });

  it('combines search, role and status before counting', async () => {
    const response = await list(
      adminToken,
      'search=staff&role=WAREHOUSE_STAFF&status=INACTIVE',
    ).expect(200);

    const body = response.body as ListBody;
    expect(body.total).toBe(1);
    expect(body.items.map((item) => item.id)).toEqual([inactiveId]);
  });

  it.each([
    ['_', 1],
    ['%', 0],
    ['\\', 0],
  ])('treats search %s as literal text', async (search, total) => {
    const response = await list(
      adminToken,
      `search=${encodeURIComponent(search)}`,
    ).expect(200);

    expect(response.body.total).toBe(total);
  });

  it('returns an empty page without losing the filtered total', async () => {
    const response = await list(
      adminToken,
      'page=9007199254740991&size=20',
    ).expect(200);

    expect(response.body).toEqual({
      items: [],
      page: Number.MAX_SAFE_INTEGER,
      size: 20,
      total: 4,
      totalPages: 1,
    });
  });

  it('returns zero totals when nothing matches', async () => {
    const response = await list(
      adminToken,
      'search=no-matching-account',
    ).expect(200);

    expect(response.body).toEqual({
      items: [],
      page: 0,
      size: 20,
      total: 0,
      totalPages: 0,
    });
  });

  it.each([
    'page=-1',
    'page=1.5',
    'page=1e2',
    'page=',
    'page=9007199254740992',
    'page=0&page=1',
    'size=0',
    'size=101',
    'size=',
    'role=OWNER',
    'status=DISABLED',
    'unknown=value',
    `search=${'a'.repeat(255)}`,
  ])('rejects invalid query %s', async (query) => {
    const response = await list(adminToken, query).expect(400);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.correlationId).toEqual(expect.any(String));
  });

  it('rejects requests without a token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/users')
      .expect(401);

    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it.each([managerId, staffId])(
    'rejects non-admin account %s before query validation',
    async (id) => {
      const token = await jwt.signAsync({ sub: id });
      const response = await list(token, 'size=101').expect(403);

      expect(response.body.code).toBe('FORBIDDEN');
    },
  );

  it('rejects an inactive account with a valid token', async () => {
    const token = await jwt.signAsync({ sub: inactiveId });
    const response = await list(token).expect(401);

    expect(response.body.code).toBe('UNAUTHORIZED');
  });

  it('rejects an expired token', async () => {
    const token = await jwt.signAsync({ sub: adminId }, { expiresIn: -1 });

    await list(token).expect(401);
  });

  it('applies revoked Admin access even while the token is valid', async () => {
    await list().expect(200);

    await prisma.user.update({
      where: { id: adminId },
      data: {
        role: 'WAREHOUSE_MANAGER',
        assignedWarehouseId: warehouseId,
      },
    });

    try {
      await list().expect(403);
    } finally {
      await prisma.user.update({
        where: { id: adminId },
        data: {
          role: 'ADMIN',
          assignedWarehouseId: null,
        },
      });
    }
  });

  it('applies account disable even while the token is valid', async () => {
    await prisma.user.update({
      where: { id: adminId },
      data: { status: 'INACTIVE' },
    });

    try {
      await list().expect(401);
    } finally {
      await prisma.user.update({
        where: { id: adminId },
        data: { status: 'ACTIVE' },
      });
    }
  });
});
