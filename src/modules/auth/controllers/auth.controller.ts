import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Public } from '../decorators/public.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../security/entities/user.entity';
import { LoginDto } from '../dto/login.dto';
import { VerifyMFADto, DisableMFADto } from '../dto/mfa.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { SessionResponseDto } from '../dto/session.dto';
import { SessionInfo } from '../interfaces/session-info.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * POST /auth/login
   * Login con email y password
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const sessionInfo = this.extractSessionInfo(req);
    return this.authService.login(loginDto, sessionInfo);
  }

  /**
   * POST /auth/mfa/verify
   * Verificar código MFA
   */
  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMFA(@Body() verifyMFADto: VerifyMFADto, @Req() req: Request) {
    const sessionInfo = this.extractSessionInfo(req);
    return this.authService.verifyMFA(
      verifyMFADto.tempToken,
      verifyMFADto.code,
      sessionInfo,
    );
  }

  /**
   * POST /auth/logout
   * Cerrar sesión actual
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: User, @Req() _req: Request) {
    // Extraer sessionId del token (si está disponible)
    // Por ahora, cerramos todas las sesiones del usuario
    await this.sessionService.closeAllSessions(user.id);
  }

  /**
   * POST /auth/refresh
   * Refrescar access token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * GET /auth/sessions
   * Listar sesiones activas del usuario actual
   */
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getSessions(@CurrentUser() user: User): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionService.getActiveSessions(user.id);
    return sessions.map((session) => ({
      id: session.id,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      country: session.country,
      city: session.city,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt,
    }));
  }

  /**
   * DELETE /auth/sessions/:id
   * Cerrar sesión específica
   */
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async closeSession(
    @Param('id') sessionId: string,
    @CurrentUser() user: User,
  ) {
    await this.sessionService.closeSession(sessionId, user.id);
  }

  /**
   * POST /auth/mfa/enable
   * Habilitar MFA para el usuario actual
   */
  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  async enableMFA(@CurrentUser() user: User) {
    return this.authService.enableMFA(user.id);
  }

  /**
   * POST /auth/mfa/disable
   * Deshabilitar MFA para el usuario actual
   */
  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableMFA(
    @Body() disableMFADto: DisableMFADto,
    @CurrentUser() user: User,
  ) {
    await this.authService.disableMFA(user.id, disableMFADto.code);
  }

  /**
   * POST /auth/forgot-password
   * Solicitar correo de recuperación de contraseña
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  /**
   * POST /auth/reset-password
   * Restablecer contraseña mediante token
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  /**
   * Extraer información de sesión del request
   */
  private extractSessionInfo(req: Request): SessionInfo {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '';

    // Parsear user agent (simplificado)
    const browser = this.extractBrowser(userAgent);
    const os = this.extractOS(userAgent);
    const deviceType = this.extractDeviceType(userAgent);

    return {
      device: {
        deviceName: `${browser} on ${os}`,
        deviceType,
        browser,
        os,
      },
      location: {
        ipAddress,
        // TODO: Implementar geolocalización por IP (opcional)
        country: undefined,
        city: undefined,
        latitude: undefined,
        longitude: undefined,
      },
    };
  }

  private extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private extractDeviceType(userAgent: string): string {
    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    return 'desktop';
  }
}
