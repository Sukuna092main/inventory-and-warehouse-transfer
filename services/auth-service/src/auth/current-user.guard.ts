import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthPrismaService } from '../database/prisma/auth-prisma.service';

export interface CurrentUserRequest extends Request {
  currentUser: {
    id: string;
    username: string;
    email: string;
    role: string;
    assignedWarehouseId: string | null;
    status: string;
    additionalPermissions: string[];
  };
}

function unauthorized(): HttpException {
  return new HttpException(
    {
      code: 'UNAUTHORIZED',
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
    },
    HttpStatus.UNAUTHORIZED,
  );
}

@Injectable()
export class CurrentUserGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: AuthPrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CurrentUserRequest>();
    const match = /^Bearer ([A-Za-z0-9._~-]+)$/i.exec(
      request.header('authorization') ?? '',
    );
    if (!match) throw unauthorized();

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(match[1]);
    } catch {
      throw unauthorized();
    }
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
      throw unauthorized();
    }

    let user;
    try {
      user = await this.prisma.client.user.findUnique({
        where: { id: subject },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          assignedWarehouseId: true,
          status: true,
          permissions: {
            select: { permission: true },
            orderBy: { permission: 'asc' },
          },
        },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Dịch vụ tài khoản tạm thời không khả dụng.',
      );
    }
    if (!user || user.status !== 'ACTIVE') throw unauthorized();

    request.currentUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      assignedWarehouseId: user.assignedWarehouseId,
      status: user.status,
      additionalPermissions: user.permissions.map((item) => item.permission),
    };
    return true;
  }
}
