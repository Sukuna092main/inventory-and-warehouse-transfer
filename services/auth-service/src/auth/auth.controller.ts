import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { CurrentUserRequest } from './current-user.guard';
import { CurrentUserGuard } from './current-user.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  login(@Body() input: LoginDto) {
    return this.auth.login(input);
  }

  @Get('me')
  @UseGuards(CurrentUserGuard)
  @Header('Cache-Control', 'no-store')
  me(@Req() request: CurrentUserRequest) {
    return request.currentUser;
  }
}
