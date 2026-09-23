import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createAuthPrisma } from './prisma-client';

@Injectable()
export class AuthPrismaService implements OnModuleDestroy {
  readonly client: ReturnType<typeof createAuthPrisma>;

  constructor(config: ConfigService) {
    this.client = createAuthPrisma({
      DB_HOST: config.getOrThrow<string>('DB_HOST'),
      DB_PORT: config.getOrThrow<number>('DB_PORT'),
      DB_NAME: config.getOrThrow<string>('DB_NAME'),
      DB_USERNAME: config.getOrThrow<string>('DB_USERNAME'),
      DB_PASSWORD: config.getOrThrow<string>('DB_PASSWORD'),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
