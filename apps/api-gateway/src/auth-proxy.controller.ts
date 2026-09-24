import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';

@Controller('api/auth')
export class AuthProxyController {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  login(@Req() request: Request, @Res() response: Response): Promise<void> {
    return this.forward(request, response, 'POST', '/api/auth/login');
  }

  @Get('me')
  async me(@Req() request: Request, @Res() response: Response): Promise<void> {
    const authorization = request.header('authorization') ?? '';
    const match = /^Bearer ([A-Za-z0-9._~-]+)$/i.exec(authorization);
    if (!match) {
      this.error(response, 401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
      return;
    }
    try {
      const payload: unknown = await this.jwt.verifyAsync(match[1]);
      const subject =
        payload && typeof payload === 'object' && 'sub' in payload
          ? payload.sub
          : undefined;
      if (
        typeof subject !== 'string' ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          subject,
        )
      ) {
        throw new Error('Invalid JWT subject');
      }
    } catch {
      this.error(response, 401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
      return;
    }
    await this.forward(request, response, 'GET', '/api/auth/me', authorization);
  }

  private async forward(
    request: Request,
    response: Response,
    method: 'GET' | 'POST',
    path: string,
    authorization?: string,
  ): Promise<void> {
    const upstreamUrl = new URL(
      path,
      this.config.getOrThrow<string>('AUTH_SERVICE_URL'),
    );
    const correlationId = String(request.headers['x-correlation-id']);
    const headers: Record<string, string> = { 'X-Correlation-ID': correlationId };
    if (authorization) headers.Authorization = authorization;
    if (method === 'POST') headers['Content-Type'] = 'application/json';
    try {
      const upstream = await fetch(upstreamUrl, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(request.body ?? {}) : undefined,
        signal: AbortSignal.timeout(5000),
        redirect: 'manual',
      });
      if (upstream.status >= 300 && upstream.status < 400) {
        this.error(response, 503, 'SERVICE_UNAVAILABLE', 'Dịch vụ tài khoản tạm thời không khả dụng.');
        return;
      }
      const body = Buffer.from(await upstream.arrayBuffer());
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/json');
      response.status(upstream.status).send(body);
    } catch {
      this.error(response, 503, 'SERVICE_UNAVAILABLE', 'Dịch vụ tài khoản tạm thời không khả dụng.');
    }
  }

  private error(
    response: Response,
    status: number,
    code: string,
    message: string,
  ): void {
    response.setHeader('Cache-Control', 'no-store');
    response.status(status).json({
      code,
      message,
      correlationId: response.getHeader('X-Correlation-ID'),
    });
  }
}
