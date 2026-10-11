import { Module } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthModule } from '../auth/auth.module';
import { CurrentUserGuard } from '../auth/current-user.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, CurrentUserGuard, AdminGuard],
})
export class UsersModule {}
