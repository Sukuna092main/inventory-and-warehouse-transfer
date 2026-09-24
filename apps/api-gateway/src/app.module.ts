import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthProxyController } from './auth-proxy.controller';
import { jwtVerifyOptions, validateEnvironment } from './gateway.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnvironment,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        jwtVerifyOptions(config.getOrThrow<string>('JWT_SECRET')),
    }),
  ],
  controllers: [AuthProxyController],
})
export class AppModule {}
