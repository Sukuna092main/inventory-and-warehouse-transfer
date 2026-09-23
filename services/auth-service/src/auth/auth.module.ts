import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthPrismaService } from '../database/prisma/auth-prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtOptions } from './jwt.config';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        jwtOptions(config.get<string>('JWT_SECRET')),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthPrismaService],
})
export class AuthModule {}
