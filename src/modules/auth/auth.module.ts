import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { User } from '../security/entities/user.entity';
import { Session } from '../security/entities/session.entity';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { JwtTokenService } from './services/jwt-token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthController } from './controllers/auth.controller';
import { ProfileController } from './controllers/profile.controller';
import { ProfileService } from './services/profile.service';
import { DeviceLogoutController } from './controllers/device-logout.controller';
import { ExpiredSessionsScheduler } from './schedulers/expired-sessions.scheduler';
import { AuditModule } from '../audit/audit.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Session]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>(
          'JWT_SECRET',
          'default-secret-change-in-production',
        ),
        signOptions: {
          expiresIn: '15m', // Access token expira en 15 minutos
        },
      }),
    }),
    AuditModule,
    NotificationModule,
  ],
  controllers: [AuthController, ProfileController, DeviceLogoutController],
  providers: [
    AuthService,
    ProfileService,
    ExpiredSessionsScheduler,
    SessionService,
    JwtTokenService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, SessionService, JwtTokenService, JwtAuthGuard],
})
export class AuthModule {}
