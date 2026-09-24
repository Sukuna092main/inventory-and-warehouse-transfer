import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GatewayErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const code =
      status === 400
        ? 'VALIDATION_ERROR'
        : status === 404
          ? 'NOT_FOUND'
          : 'INTERNAL_ERROR';
    const message =
      status === 400
        ? 'Dữ liệu gửi lên không hợp lệ.'
        : status === 404
          ? 'Đường dẫn không tồn tại.'
          : 'Có lỗi khi xử lý yêu cầu.';
    response.setHeader('Cache-Control', 'no-store');
    response.status(status).json({
      code,
      message,
      correlationId: request.headers['x-correlation-id'],
    });
  }
}
