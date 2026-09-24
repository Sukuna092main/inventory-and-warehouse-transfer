import { randomBytes, randomUUID } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import { hashPassword } from '../src/auth/password';
import { configureApp } from '../src/configure-app';
import { jwtOptions } from '../src/auth/jwt.config';
import { AuthPrismaService } from '../src/database/prisma/auth-prisma.service';
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

describe('POST /api/auth/login with PostgreSQL', () => {
  const schema = newTestSchema('login');
  const secret = randomBytes(32).toString('hex');
  const password = ' mat-khau-test-login-🙂 ';
  const userId = randomUUID();
  let db: TestPgClient;
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let created = false;

  beforeAll(async () => {
    db = await openTestPostgres();
    await createCommittedTestSchema(db, schema);
    created = true;
    const passwordHash = await hashPassword(password);
    prisma = createAuthPrisma(testDatabaseConfig(), schema);
    await prisma.user.createMany({
      data: [
        {
          id: userId,
          username: 'login_admin',
          email: 'login@example.test',
          passwordHash,
          role: 'ADMIN',
        },
        {
          id: randomUUID(),
          username: 'disabled_admin',
          email: 'disabled@example.test',
          passwordHash,
          role: 'ADMIN',
          status: 'INACTIVE',
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
        AuthModule,
      ],
    })
      .overrideProvider(AuthPrismaService)
      .useValue({ client: prisma })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
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

  it.each(['login_admin', ' LOGIN_ADMIN ', ' LOGIN@EXAMPLE.TEST '])(
    'accepts normalized identity %s and returns a signed 30-minute token',
    async (identifier) => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier, password })
        .expect(200);
      const body = response.body as {
        accessToken: string;
        tokenType: string;
        expiresIn: number;
      };
      expect(Object.keys(body).sort()).toEqual([
        'accessToken',
        'expiresIn',
        'tokenType',
      ]);
      expect(body.tokenType).toBe('Bearer');
      expect(body.expiresIn).toBe(1800);
      expect(response.headers['cache-control']).toBe('no-store');
      const payload = await new JwtService(jwtOptions(secret)).verifyAsync<{
        sub: string;
        iat: number;
        exp: number;
      }>(body.accessToken);
      expect(payload.sub).toBe(userId);
      expect(payload.exp - payload.iat).toBe(1800);
      expect(Object.keys(payload).sort()).toEqual([
        'aud',
        'exp',
        'iat',
        'iss',
        'sub',
      ]);
      expect(await prisma.userAuditLog.count()).toBe(0);
    },
  );

  it.each([
    ['wrong password', 'login_admin', 'wrong-password-value'],
    ['trimmed password', 'login_admin', password.trim()],
    ['unknown user', 'nobody', password],
    ['disabled user', 'disabled_admin', password],
    ['SQL input', "' OR 1=1 --", password],
  ])(
    'rejects %s with the same safe error',
    async (_label, identifier, suppliedPassword) => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Correlation-ID', 'test-login-401')
        .send({ identifier, password: suppliedPassword })
        .expect(401);
      expect(response.body).toEqual({
        code: 'INVALID_CREDENTIALS',
        message:
          'Thông tin đăng nhập không hợp lệ hoặc tài khoản không khả dụng.',
        correlationId: 'test-login-401',
      });
      expect(response.headers['x-correlation-id']).toBe('test-login-401');
    },
  );

  it.each([
    {},
    { identifier: 'login_admin' },
    { password },
    { identifier: 123, password },
    { identifier: {}, password },
    { identifier: '   ', password },
    { identifier: 'a'.repeat(255), password },
    { identifier: 'login_admin', password: 123 },
    { identifier: 'login_admin', password: '' },
    { identifier: 'login_admin', password: 'a'.repeat(129) },
    { identifier: 'login_admin', password, role: 'ADMIN' },
    [],
  ])('rejects malformed login body %#', async (body) => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send(body)
      .expect(400);
    expect(response.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      correlationId: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toContain(password);
  });

  it('does not echo invalid JSON or accept an unsafe correlation ID', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Correlation-ID', '<invalid>')
      .send('{"password":"secret-sentinel",broken}')
      .expect(400);
    expect(response.body).toMatchObject({
      code: 'VALIDATION_ERROR',
      correlationId: expect.any(String),
    });
    expect(JSON.stringify(response.body)).not.toContain('secret-sentinel');
    expect(response.body.correlationId).not.toBe('<invalid>');
  });

  it('returns a safe 503 when the user table is unavailable', async () => {
    await db.query(`ALTER TABLE "${schema}".users RENAME TO users_unavailable`);
    try {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: 'login_admin', password })
        .expect(503);
      expect(response.body).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
      expect(JSON.stringify(response.body)).not.toContain('SELECT');
      expect(JSON.stringify(response.body)).not.toContain(password);
    } finally {
      await db.query(
        `ALTER TABLE "${schema}".users_unavailable RENAME TO users`,
      );
    }
  });

  it('returns the current account from a login token without sensitive fields', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: 'login_admin', password })
      .expect(200);
    const response = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(response.body).toEqual({
      id: userId,
      username: 'login_admin',
      email: 'login@example.test',
      role: 'ADMIN',
      assignedWarehouseId: null,
      status: 'ACTIVE',
      additionalPermissions: [],
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.body)).not.toContain(password);
    expect(response.body).not.toHaveProperty('passwordHash');
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `bearer ${login.body.accessToken}`)
      .expect(200);
  });

  it('reads changed role, warehouse and permissions on every request', async () => {
    const token = await new JwtService(jwtOptions(secret)).signAsync({
      sub: userId,
    });
    const warehouseId = randomUUID();
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'WAREHOUSE_MANAGER', assignedWarehouseId: warehouseId },
    });
    await prisma.userPermission.create({
      data: {
        userId,
        permission: 'VIEW_OTHER_INVENTORY',
        grantedBy: userId,
      },
    });
    try {
      const first = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(first.body).toMatchObject({
        role: 'WAREHOUSE_MANAGER',
        assignedWarehouseId: warehouseId,
        additionalPermissions: ['VIEW_OTHER_INVENTORY'],
      });
      await prisma.userPermission.delete({
        where: {
          userId_permission: { userId, permission: 'VIEW_OTHER_INVENTORY' },
        },
      });
      const second = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(second.body.additionalPermissions).toEqual([]);
    } finally {
      await prisma.userPermission.deleteMany({ where: { userId } });
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'ADMIN', assignedWarehouseId: null },
      });
    }
  });

  it('rejects a disabled account even while its token remains valid', async () => {
    const token = await new JwtService(jwtOptions(secret)).signAsync({
      sub: userId,
    });
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    });
    try {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(response.body).toMatchObject({ code: 'UNAUTHORIZED' });
    } finally {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
    }
  });

  it.each([undefined, 'Token value', 'Bearer ', 'Bearer a b'])(
    'rejects a missing or malformed Authorization header %#',
    async (authorization) => {
      const call = request(app.getHttpServer()).get('/api/auth/me');
      if (authorization !== undefined) call.set('Authorization', authorization);
      const response = await call.expect(401);
      expect(response.body).toMatchObject({ code: 'UNAUTHORIZED' });
    },
  );

  it('rejects wrong signature, expired token and invalid subject', async () => {
    const jwt = new JwtService(jwtOptions(secret));
    const tokens = [
      await new JwtService(
        jwtOptions(randomBytes(32).toString('hex')),
      ).signAsync({
        sub: userId,
      }),
      await jwt.signAsync({ sub: userId }, { expiresIn: -1 }),
      await jwt.signAsync({ sub: 'not-a-user-id' }),
    ];
    for (const token of tokens) {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(response.body).toMatchObject({ code: 'UNAUTHORIZED' });
    }
  });

  it('returns a safe 503 when current account cannot be read', async () => {
    const token = await new JwtService(jwtOptions(secret)).signAsync({
      sub: userId,
    });
    await db.query(`ALTER TABLE "${schema}".users RENAME TO users_unavailable`);
    try {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(503);
      expect(response.body).toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
      expect(JSON.stringify(response.body)).not.toContain('SELECT');
    } finally {
      await db.query(
        `ALTER TABLE "${schema}".users_unavailable RENAME TO users`,
      );
    }
  });
});
