import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../security/entities/user.entity';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  TempTokenPayload,
} from '../interfaces/token-payload.interface';
import * as crypto from 'crypto';

@Injectable()
export class JwtTokenService {
  private readonly MAX_TOKEN_SIZE = 4096; // 4KB límite para headers HTTP

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Generar access token con permisos del usuario
   * Duración: 15 minutos
   */
  async generateAccessToken(user: User): Promise<string> {
    // Obtener roles del usuario
    const roles = user.roles?.map((role) => role.name) || [];

    // TODO: Obtener permisos del usuario (se implementará en RBACService)
    // Por ahora usamos un array vacío
    const permissions: string[] = [];

    const payload: AccessTokenPayload = {
      userId: user.id,
      email: user.username,
      username: user.username,
      organizationId: user.organizationId,
      roles,
    };

    // Si los permisos son muchos, usar hash en lugar de incluirlos todos
    const permissionsString = JSON.stringify(permissions);
    if (permissionsString.length > 1000) {
      // Si los permisos son muy grandes, usar hash
      payload.permissionsHash = this.hashPermissions(permissions);
    } else {
      payload.permissions = permissions;
    }

    const token = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    // Verificar tamaño del token
    if (token.length > this.MAX_TOKEN_SIZE) {
      // Si el token es muy grande, usar solo hash de permisos
      const reducedPayload: AccessTokenPayload = {
        ...payload,
        permissions: undefined,
        permissionsHash: this.hashPermissions(permissions),
      };
      return this.jwtService.sign(reducedPayload, {
        expiresIn: '15m',
      });
    }

    return token;
  }

  /**
   * Generar refresh token
   * Duración: 7 días
   */
  async generateRefreshToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    const payload: RefreshTokenPayload = {
      userId,
      sessionId,
    };

    return this.jwtService.sign(payload, {
      expiresIn: '7d',
    });
  }

  /**
   * Generar temp token para MFA
   * Duración: 5 minutos
   */
  async generateTempToken(userId: string): Promise<string> {
    const payload: TempTokenPayload = {
      userId,
      mfaRequired: true,
    };

    return this.jwtService.sign(payload, {
      expiresIn: '5m',
    });
  }

  /**
   * Verificar access token
   */
  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verify<AccessTokenPayload>(token);
  }

  /**
   * Verificar refresh token
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verify<RefreshTokenPayload>(token);
  }

  /**
   * Verificar temp token
   */
  async verifyTempToken(token: string): Promise<TempTokenPayload> {
    return this.jwtService.verify<TempTokenPayload>(token);
  }

  /**
   * Generar token para restablecimiento de contraseña
   * Duración: 2 horas
   */
  async generatePasswordResetToken(
    userId: string,
    email: string,
  ): Promise<string> {
    return this.jwtService.sign(
      { userId, email, type: 'PASSWORD_RESET' },
      { expiresIn: '2h' },
    );
  }

  /**
   * Verificar token para restablecimiento de contraseña
   */
  async verifyPasswordResetToken(
    token: string,
  ): Promise<{ userId: string; email: string; type: string }> {
    return this.jwtService.verify<{
      userId: string;
      email: string;
      type: string;
    }>(token);
  }

  /**
   * Generar hash de permisos para tokens grandes
   */
  private hashPermissions(permissions: string[]): string {
    const permissionsString = permissions.sort().join(',');
    return crypto.createHash('sha256').update(permissionsString).digest('hex');
  }
}
