import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import { correlationIdMiddleware } from './correlation-id';
import { GatewayErrorFilter } from './gateway-error.filter';

export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService);
  app.use(correlationIdMiddleware);
  app.useGlobalFilters(new GatewayErrorFilter());
  app.enableCors({
    origin: [config.getOrThrow<string>('WEB_ORIGIN')],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Correlation-ID'],
    exposedHeaders: ['X-Correlation-ID'],
  });
}
