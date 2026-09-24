const assert = require('node:assert/strict');
const { randomBytes, randomUUID } = require('node:crypto');
const { createServer } = require('node:http');
const { before, after, test } = require('node:test');

const secret = randomBytes(32).toString('hex');
const userId = randomUUID();
const received = [];
let upstream;
let app;
let baseUrl;
let token;

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
  return new Promise((resolve, reject) => {
    if (!server.listening) return resolve();
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

before(async () => {
  upstream = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf8');
    received.push({
      method: request.method,
      path: request.url,
      correlationId: request.headers['x-correlation-id'],
      authorization: request.headers.authorization,
      body,
    });
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    if (request.url === '/api/auth/login' && request.method === 'POST') {
      if (JSON.parse(body).identifier === 'reject') {
        response.statusCode = 401;
        response.end(JSON.stringify({ code: 'INVALID_CREDENTIALS', message: 'Tài khoản không hợp lệ.', correlationId: request.headers['x-correlation-id'] }));
      } else {
        response.end(JSON.stringify({ accessToken: token, tokenType: 'Bearer', expiresIn: 1800 }));
      }
    } else if (request.url === '/api/auth/me' && request.method === 'GET') {
      response.end(JSON.stringify({ id: userId, role: 'ADMIN', additionalPermissions: [] }));
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({ code: 'NOT_FOUND' }));
    }
  });
  await listen(upstream);
  process.env.AUTH_SERVICE_URL = `http://127.0.0.1:${upstream.address().port}`;
  process.env.JWT_SECRET = secret;
  process.env.WEB_ORIGIN = 'http://localhost:5173';
  const { JwtService } = require('@nestjs/jwt');
  token = await new JwtService({
    secret: Buffer.from(secret, 'hex'),
    signOptions: {
      algorithm: 'HS256',
      expiresIn: 1800,
      issuer: 'inventory-auth',
      audience: 'inventory-api',
    },
  }).signAsync({ sub: userId });
  const { NestFactory } = require('@nestjs/core');
  const { AppModule } = require('../dist/app.module.js');
  const { configureApp } = require('../dist/configure-app.js');
  app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  baseUrl = `http://127.0.0.1:${app.getHttpServer().address().port}`;
});

after(async () => {
  if (app) await app.close();
  if (upstream) await close(upstream);
});

test('forwards login body and correlation ID without changing Auth response', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': 'gateway-login-test' },
    body: JSON.stringify({ identifier: 'admin', password: 'test-only' }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { accessToken: token, tokenType: 'Bearer', expiresIn: 1800 });
  assert.equal(response.headers.get('x-correlation-id'), 'gateway-login-test');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(received.at(-1), {
    method: 'POST',
    path: '/api/auth/login',
    correlationId: 'gateway-login-test',
    authorization: undefined,
    body: JSON.stringify({ identifier: 'admin', password: 'test-only' }),
  });
});

test('verifies JWT before forwarding me to Auth', async () => {
  const valid = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { id: userId, role: 'ADMIN', additionalPermissions: [] });
  assert.equal(received.at(-1).authorization, `Bearer ${token}`);

  const count = received.length;
  const invalid = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: 'Bearer invalid.token.value' },
  });
  assert.equal(invalid.status, 401);
  assert.equal((await invalid.json()).code, 'UNAUTHORIZED');
  assert.equal(received.length, count);
});

test('preserves Auth 401 response and formats malformed JSON locally', async () => {
  const rejected = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': 'gateway-reject-test' },
    body: JSON.stringify({ identifier: 'reject', password: 'wrong' }),
  });
  assert.equal(rejected.status, 401);
  assert.deepEqual(await rejected.json(), {
    code: 'INVALID_CREDENTIALS',
    message: 'Tài khoản không hợp lệ.',
    correlationId: 'gateway-reject-test',
  });

  const count = received.length;
  const malformed = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': 'gateway-json-test' },
    body: '{"password":"do-not-echo",broken}',
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), {
    code: 'VALIDATION_ERROR',
    message: 'Dữ liệu gửi lên không hợp lệ.',
    correlationId: 'gateway-json-test',
  });
  assert.equal(received.length, count);
});

test('applies CORS only for configured web origin', async () => {
  const allowed = await fetch(`${baseUrl}/api/auth/me`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' },
  });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const other = await fetch(`${baseUrl}/api/auth/me`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://example.test', 'Access-Control-Request-Method': 'GET' },
  });
  assert.equal(other.headers.get('access-control-allow-origin'), null);
});

test('returns 503 with correlation ID when Auth is unavailable', async () => {
  await close(upstream);
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Correlation-ID': 'gateway-down-test' },
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Dịch vụ tài khoản tạm thời không khả dụng.',
    correlationId: 'gateway-down-test',
  });
});
