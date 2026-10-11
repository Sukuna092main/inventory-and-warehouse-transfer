import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { CurrentUserRequest } from './current-user.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CurrentUserRequest>();

    if (request.currentUser?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Bạn không có quyền thực hiện thao tác này.',
      );
    }

    return true;
  }
}
