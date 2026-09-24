import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

const ERROR_CODES: Record<number, string> = {
  400: 'VALIDATION_ERROR',
  401: 'INVALID_CREDENTIALS',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'TOO_MANY_REQUESTS',
  503: 'SERVICE_UNAVAILABLE',
};

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const suppliedId = request.header('x-correlation-id');
    const correlationId =
      suppliedId && /^[a-zA-Z0-9._:-]{1,128}$/.test(suppliedId)
        ? suppliedId
        : randomUUID();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      error instanceof HttpException ? error.getResponse() : undefined;
    const rawMessage =
      typeof body === 'object' && body !== null && 'message' in body
        ? body.message
        : undefined;
    const rawCode =
      typeof body === 'object' && body !== null && 'code' in body
        ? body.code
        : undefined;
    const details = Array.isArray(rawMessage)
      ? rawMessage.filter((item): item is string => typeof item === 'string')
      : undefined;
    const message =
      status === 500
        ? 'Có lỗi khi xử lý yêu cầu.'
        : status === 400 || details
          ? 'Dữ liệu gửi lên không hợp lệ.'
          : typeof rawMessage === 'string'
            ? rawMessage
            : 'Yêu cầu không hợp lệ.';
    response.setHeader('X-Correlation-ID', correlationId);
    response.setHeader('Cache-Control', 'no-store');
    if (status === 429) response.setHeader('Retry-After', '1');
    response.status(status).json({
      code:
        typeof rawCode === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(rawCode)
          ? rawCode
          : (ERROR_CODES[status] ?? 'INTERNAL_ERROR'),
      message,
      correlationId,
      ...(details ? { details } : {}),
    });
  }
}
