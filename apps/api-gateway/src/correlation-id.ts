import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

const logger = new Logger('GatewayRequest');

export function correlationIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const supplied = request.header('x-correlation-id');
  const correlationId =
    supplied && /^[a-zA-Z0-9._:-]{1,128}$/.test(supplied)
      ? supplied
      : randomUUID();
  request.headers['x-correlation-id'] = correlationId;
  response.setHeader('X-Correlation-ID', correlationId);
  const startedAt = Date.now();
  response.once('finish', () => {
    // Only route metadata is logged; never log credentials, headers or bodies.
    logger.log(
      `${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms correlationId=${correlationId}`,
    );
  });
  next();
}
