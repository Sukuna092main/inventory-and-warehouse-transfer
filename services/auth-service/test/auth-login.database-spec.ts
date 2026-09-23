import { randomBytes, randomUUID } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { App } from 'supertest/types';
import configuredDataSource from '../src/database/data-source';
import { AuthModule } from '../src/auth/auth.module';
import { User } from '../src/users/entities/user.entity';
import { UserAuditLog } from '../src/users/entities/user-audit-log.entity';
import { hashPassword } from '../src/auth/password';
import { configureApp } from '../src/configure-app';
import { jwtOptions } from '../src/auth/jwt.config';
import { AuthPrismaService } from '../src/database/prisma/auth-prisma.service';
import { createAuthPrisma } from '../src/database/prisma/prisma-client';
import type { PrismaClient } from '../src/generated/prisma/client';

describe('POST /api/auth/login with PostgreSQL', () => {
  const schema = `login_test_${randomUUID().replaceAll('-', '')}`;
  const secret = randomBytes(32).toString('hex');
  const password = ' mat-khau-test-login-🙂 ';
  const userId = randomUUID();
  let db: DataSource;
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let created = false;

  beforeAll(async () => {
    const options = configuredDataSource.options;
    if (options.type !== 'postgres') throw new Error('PostgreSQL required');
    db = new DataSource({ ...options, schema, logging: false });
    await db.initialize();
    await db.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    await db.runMigrations();
    const passwordHash = await hashPassword(password);
    await db.manager.insert(User, [
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
    ]);
    prisma = createAuthPrisma(
      {
        DB_HOST: options.host ?? '127.0.0.1',
        DB_PORT: options.port ?? 5432,
        DB_NAME: options.database ?? 'auth_db',
        DB_USERNAME: options.username ?? '',
        DB_PASSWORD: options.password ?? '',
      },
      schema,
    );
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
      if (created && db?.isInitialized) {
        if (!/^login_test_[a-f0-9]{32}$/.test(schema))
          throw new Error('Invalid test schema');
        await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      }
    } finally {
      if (app) await app.close();
      if (prisma) await prisma.$disconnect();
      if (db?.isInitialized) await db.destroy();
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
      expect(await db.manager.count(UserAuditLog)).toBe(0);
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
});
