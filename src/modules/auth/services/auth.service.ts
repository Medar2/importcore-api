import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { User } from '../../security/entities/user.entity';
import { Session } from '../../security/entities/session.entity';
import { LoginDto, LoginResponseDto } from '../dto/login.dto';
import { EnableMFAResponseDto } from '../dto/mfa.dto';
import { JwtTokenService } from './jwt-token.service';
import { SessionService } from './session.service';
import { AuditService } from '../../audit/services/audit.service';
import { AuthTokens } from '../interfaces/token-payload.interface';
import { SessionInfo } from '../interfaces/session-info.interface';
import { EmailService } from '../../notification/services/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly jwtTokenService: JwtTokenService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Login básico - valida credenciales y verifica si requiere MFA
   */
  async login(
    loginDto: LoginDto,
    sessionInfo: SessionInfo,
  ): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { person: { email } },
      relations: ['person', 'roles', 'roles.permissions', 'organization'],
    });

    if (!user) {
      // Log LOGIN_FAILED
      await this.auditService.logAuthEvent({
        userEmail: email,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'User not found' },
        ipAddress: sessionInfo.location.ipAddress,
        userAgent: sessionInfo.device.browser,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'active') {
      // Log LOGIN_FAILED
      await this.auditService.logAuthEvent({
        userId: user.id,
        userEmail: user.person.email,
        organizationId: user.organizationId || undefined,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'User inactive' },
        ipAddress: sessionInfo.location.ipAddress,
        userAgent: sessionInfo.device.browser,
      });
      throw new UnauthorizedException('Usuario inactivo');
    }

    // Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      // Log LOGIN_FAILED
      await this.auditService.logAuthEvent({
        userId: user.id,
        userEmail: user.person.email,
        organizationId: user.organizationId || undefined,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'Invalid password' },
        ipAddress: sessionInfo.location.ipAddress,
        userAgent: sessionInfo.device.browser,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Si MFA está habilitado, retornar tempToken
    if (user.mfaEnabled) {
      const tempToken = await this.jwtTokenService.generateTempToken(user.id);
      return {
        requireMFA: true,
        tempToken,
      };
    }

    // Si no requiere MFA, crear sesión y retornar tokens
    const { accessToken, refreshToken } =
      await this.sessionService.createSession(user, sessionInfo);

    // Log LOGIN_SUCCESS
    await this.auditService.logAuthEvent({
      userId: user.id,
      userEmail: user.person.email,
      organizationId: user.organizationId || undefined,
      action: 'LOGIN_SUCCESS',
      metadata: {
        mfaUsed: false,
        deviceInfo: sessionInfo.device,
      },
      ipAddress: sessionInfo.location.ipAddress,
      userAgent: sessionInfo.device.browser,
    });

    return {
      requireMFA: false,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.person.email,
        username: user.username,
        nombre: user.person.firstName,
        apellido: user.person.lastName,
        organizationId: user.organizationId,
        roles: user.roles,
      },
    };
  }

  /**
   * Logout - cierra sesión e invalida tokens
   */
  async logout(userId: string, sessionId: string): Promise<void> {
    await this.sessionService.closeSession(sessionId, userId);

    // Log LOGOUT
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user) {
      await this.auditService.logAuthEvent({
        userId: user.id,
        userEmail: user.person.email,
        organizationId: user.organizationId || undefined,
        action: 'LOGOUT',
        metadata: { sessionId },
      });
    }
  }

  /**
   * Refresh token - genera nuevo access token usando refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Verificar refresh token y obtener sesión
    const { userId } =
      await this.sessionService.verifyRefreshToken(refreshToken);

    // Buscar usuario
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'organization'],
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Generar nuevo access token
    const accessToken = await this.jwtTokenService.generateAccessToken(user);

    return { accessToken };
  }

  /**
   * Habilitar MFA - genera secreto TOTP y códigos de recuperación
   */
  async enableMFA(userId: string): Promise<EnableMFAResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA ya está habilitado');
    }

    // Generar secreto TOTP
    const secret = speakeasy.generateSecret({
      name: `Auth System (${user.person.email})`,
      length: 32,
    });

    // Generar códigos de recuperación (10 códigos de 8 caracteres)
    const recoveryCodes = this.generateRecoveryCodes(10);

    // Encriptar y guardar
    user.mfaSecret = secret.base32;
    user.mfaRecoveryCodes = await Promise.all(
      recoveryCodes.map((code) => bcrypt.hash(code, 10)),
    );
    user.mfaEnabled = true;

    await this.userRepository.save(user);

    // Log MFA_ENABLED
    await this.auditService.logAuthEvent({
      userId: user.id,
      userEmail: user.person.email,
      organizationId: user.organizationId || undefined,
      action: 'MFA_ENABLED',
      metadata: { recoveryCodesGenerated: recoveryCodes.length },
    });

    // Generar QR code
    const qrCode = await qrcode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode,
      recoveryCodes,
    };
  }

  /**
   * Verificar código MFA
   */
  async verifyMFA(
    tempToken: string,
    code: string,
    sessionInfo: SessionInfo,
  ): Promise<AuthTokens> {
    // Verificar temp token
    const payload = await this.jwtTokenService.verifyTempToken(tempToken);

    if (!payload.mfaRequired) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.userId },
      relations: ['person', 'roles', 'roles.permissions', 'organization'],
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA no configurado');
    }

    // Verificar código TOTP
    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2, // Permitir 2 ventanas de tiempo (60 segundos antes/después)
    });

    if (!isValid) {
      // Log MFA_FAILED
      await this.auditService.logAuthEvent({
        userId: user.id,
        userEmail: user.person.email,
        organizationId: user.organizationId || undefined,
        action: 'LOGIN_FAILED',
        metadata: { reason: 'Invalid MFA code' },
        ipAddress: sessionInfo.location.ipAddress,
        userAgent: sessionInfo.device.browser,
      });
      throw new UnauthorizedException('Código MFA inválido');
    }

    // Crear sesión y retornar tokens
    const { accessToken, refreshToken } =
      await this.sessionService.createSession(user, sessionInfo);

    // Log MFA_VERIFIED and LOGIN_SUCCESS
    await this.auditService.logAuthEvent({
      userId: user.id,
      userEmail: user.person.email,
      organizationId: user.organizationId || undefined,
      action: 'MFA_VERIFIED',
      metadata: {
        deviceInfo: sessionInfo.device,
      },
      ipAddress: sessionInfo.location.ipAddress,
      userAgent: sessionInfo.device.browser,
    });

    await this.auditService.logAuthEvent({
      userId: user.id,
      userEmail: user.person.email,
      organizationId: user.organizationId || undefined,
      action: 'LOGIN_SUCCESS',
      metadata: {
        mfaUsed: true,
        deviceInfo: sessionInfo.device,
      },
      ipAddress: sessionInfo.location.ipAddress,
      userAgent: sessionInfo.device.browser,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.person.email,
        username: user.username,
        nombre: user.person.firstName,
        apellido: user.person.lastName,
        organizationId: user.organizationId,
        roles: user.roles,
      },
    };
  }

  /**
   * Deshabilitar MFA
   */
  async disableMFA(userId: string, code: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA no está habilitado');
    }

    // Verificar código TOTP
    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret!,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!isValid) {
      throw new UnauthorizedException('Código MFA inválido');
    }

    // Deshabilitar MFA
    user.mfaEnabled = false;
    user.mfaSecret = null;
    user.mfaRecoveryCodes = null;

    await this.userRepository.save(user);

    // Log MFA_DISABLED
    await this.auditService.logAuthEvent({
      userId: user.id,
      userEmail: user.person.email,
      organizationId: user.organizationId || undefined,
      action: 'MFA_DISABLED',
      metadata: {},
    });
  }

  /**
   * Verificar código de recuperación
   */
  async verifyRecoveryCode(
    userId: string,
    recoveryCode: string,
    sessionInfo: SessionInfo,
  ): Promise<AuthTokens> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'organization'],
    });

    if (!user || !user.mfaEnabled || !user.mfaRecoveryCodes) {
      throw new UnauthorizedException('MFA no configurado');
    }

    // Verificar código de recuperación
    let codeIndex = -1;
    for (let i = 0; i < user.mfaRecoveryCodes.length; i++) {
      const isValid = await bcrypt.compare(
        recoveryCode,
        user.mfaRecoveryCodes[i],
      );
      if (isValid) {
        codeIndex = i;
        break;
      }
    }

    if (codeIndex === -1) {
      throw new UnauthorizedException('Código de recuperación inválido');
    }

    // Eliminar código usado
    user.mfaRecoveryCodes.splice(codeIndex, 1);
    await this.userRepository.save(user);

    // Crear sesión y retornar tokens
    const { accessToken, refreshToken } =
      await this.sessionService.createSession(user, sessionInfo);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Generar códigos de recuperación
   */
  private generateRecoveryCodes(count: number): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let i = 0; i < count; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push(code);
    }

    return codes;
  }

  /**
   * Solicitar recuperación de contraseña (envío de email)
   */
  async forgotPassword(email: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = await this.userRepository.findOne({
      where: [{ person: { email: cleanEmail } }, { username: cleanEmail }],
      relations: ['person'],
    });

    if (!user) {
      // Por seguridad, retornamos éxito aunque no exista el email
      return {
        success: true,
        message:
          'Si el correo está registrado, recibirás un enlace de recuperación en breve.',
      };
    }

    const targetEmail = user.person?.email || cleanEmail;
    const resetToken = await this.jwtTokenService.generatePasswordResetToken(
      user.id,
      targetEmail,
    );
    const userName =
      [user.person?.firstName, user.person?.lastName]
        .filter(Boolean)
        .join(' ') || user.username;

    await this.emailService.sendPasswordResetEmail(
      targetEmail,
      resetToken,
      userName,
    );

    return {
      success: true,
      message:
        'Si el correo está registrado, recibirás un enlace de recuperación en breve.',
    };
  }

  /**
   * Restablecer contraseña con token
   */
  async resetPassword(token: string, newPassword: string) {
    let payload: { userId: string; email: string; type: string };
    try {
      payload = await this.jwtTokenService.verifyPasswordResetToken(token);
    } catch {
      throw new UnauthorizedException(
        'El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.',
      );
    }

    if (!payload.userId || payload.type !== 'PASSWORD_RESET') {
      throw new UnauthorizedException('Token de recuperación no válido');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const salt = await bcrypt.genSalt();
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await this.userRepository.save(user);

    // Cerrar todas las sesiones activas anteriores por seguridad
    await this.sessionService.closeAllSessions(user.id);

    return {
      success: true,
      message:
        'Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
    };
  }
}
