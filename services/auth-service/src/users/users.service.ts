import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthPrismaService } from '../database/prisma/auth-prisma.service';
import type { Prisma } from '../generated/prisma/client';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';

function escapeSearch(value: string): string {
  // Tìm %, _ và dấu \ như ký tự thường, không dùng làm wildcard.
  return value.replace(/[\\%_]/g, '\\$&');
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: AuthPrismaService) {}

  async list(query: ListUsersQueryDto) {
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              {
                username: {
                  contains: escapeSearch(search),
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: escapeSearch(search),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    try {
      return await this.prisma.client.$transaction(
        async (transaction) => {
          const total = await transaction.user.count({ where });
          const totalPages = Math.ceil(total / query.size);

          // Trang vượt phạm vi trả danh sách rỗng.
          // Không gửi offset rất lớn xuống Prisma.
          if (query.page >= totalPages) {
            return {
              items: [],
              page: query.page,
              size: query.size,
              total,
              totalPages,
            };
          }

          const users = await transaction.user.findMany({
            where,
            skip: query.page * query.size,
            take: query.size,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: {
              id: true,
              username: true,
              email: true,
              role: true,
              assignedWarehouseId: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              permissions: {
                select: { permission: true },
                orderBy: { permission: 'asc' },
              },
            },
          });

          return {
            items: users.map((user) => ({
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              assignedWarehouseId: user.assignedWarehouseId,
              status: user.status,
              additionalPermissions: user.permissions.map(
                (item) => item.permission,
              ),
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
            })),
            page: query.page,
            size: query.size,
            total,
            totalPages,
          };
        },
        {
          isolationLevel: 'RepeatableRead',
        },
      );
    } catch {
      throw new ServiceUnavailableException(
        'Dịch vụ tài khoản tạm thời không khả dụng.',
      );
    }
  }
}
