import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUserGuard } from '../auth/current-user.guard';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(CurrentUserGuard, AdminGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }
}
