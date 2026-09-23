import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AuthPrismaService } from '../database/prisma/auth-prisma.service';
import { hashPassword, verifyPassword } from './password';
import { ACCESS_TOKEN_TTL_SECONDS } from './jwt.config';
import type { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash: string;
  private pendingLogins = 0;

  constructor(
    private readonly prisma: AuthPrismaService,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Unknown accounts still perform a real password comparison.
    this.dummyHash = await hashPassword(randomUUID());
  }

  async login(input: LoginDto) {
    // Each scrypt check uses ~128 MiB; bound concurrent work on the local server.
    if (this.pendingLogins >= 2) {
      throw new HttpException(
        'Đang xử lý nhiều yêu cầu đăng nhập. Vui lòng thử lại.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.pendingLogins++;
    try {
      let user: { id: string; status: string; passwordHash: string } | null;
      try {
        user = await this.prisma.client.user.findFirst({
          where: {
            OR: [{ username: input.identifier }, { email: input.identifier }],
          },
          select: { id: true, status: true, passwordHash: true },
        });
      } catch {
        throw new ServiceUnavailableException(
          'Dịch vụ tài khoản tạm thời không khả dụng.',
        );
      }
      const matches = await verifyPassword(
        input.password,
        user?.passwordHash ?? this.dummyHash,
      );
      if (!user || !matches || user.status !== 'ACTIVE') {
        throw new UnauthorizedException(
          'Thông tin đăng nhập không hợp lệ hoặc tài khoản không khả dụng.',
        );
      }
      // Permissions will be read from Auth for protected requests, not trusted from JWT claims.
      const accessToken = await this.jwt.signAsync({ sub: user.id });
      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      };
    } finally {
      this.pendingLogins--;
    }
  }
}
