import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Session } from '../../security/entities/session.entity';
import { User } from '../../security/entities/user.entity';
import { SessionInfo } from '../interfaces/session-info.interface';
import { JwtTokenService } from './jwt-token.service';
import { AuthTokens } from '../interfaces/token-payload.interface';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly jwtTokenService: JwtTokenService,
  ) {}

  /**
   * Crear sesión y generar tokens
   */
  async createSession(
    user: User,
    sessionInfo: SessionInfo,
  ): Promise<AuthTokens & { sessionId: string }> {
    // Crear sesión
    const session = this.sessionRepository.create({
      userId: user.id,
      refreshToken: '', // Se actualizará después de generar el token
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      isActive: true,
      deviceName: sessionInfo.device.deviceName,
      deviceType: sessionInfo.device.deviceType,
      browser: sessionInfo.device.browser,
      os: sessionInfo.device.os,
      ipAddress: sessionInfo.location.ipAddress,
      country: sessionInfo.location.country,
      city: sessionInfo.location.city,
      latitude: sessionInfo.location.latitude,
      longitude: sessionInfo.location.longitude,
      lastActivityAt: new Date(),
    });

    const savedSession = await this.sessionRepository.save(session);
    await this.sessionRepository.manager.update(User, user.id, {
      lastLoginAt: new Date(),
    });

    // Generar tokens
    const accessToken = await this.jwtTokenService.generateAccessToken(user);
    const refreshToken = await this.jwtTokenService.generateRefreshToken(
      user.id,
      savedSession.id,
    );

    // Guardar hash del refresh token
    savedSession.refreshToken = this.hashToken(refreshToken);
    await this.sessionRepository.save(savedSession);

    return {
      accessToken,
      refreshToken,
      sessionId: savedSession.id,
    };
  }

  /**
   * Obtener sesiones activas de un usuario
   */
  async getActiveSessions(userId: string): Promise<Session[]> {
    await this.expireSessions(userId);
    return this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { lastActivityAt: 'DESC' },
    });
  }

  /**
   * Cerrar sesión específica
   */
  async closeSession(sessionId: string, userId?: string): Promise<void> {
    const where: any = { id: sessionId, isActive: true };
    if (userId) {
      where.userId = userId;
    }

    const session = await this.sessionRepository.findOne({ where });

    if (!session) {
      throw new BadRequestException('Sesión no encontrada o ya cerrada');
    }

    session.isActive = false;
    await this.sessionRepository.save(session);
  }

  /**
   * Cerrar todas las sesiones de un usuario
   */
  async closeAllSessions(
    userId: string,
    exceptSessionId?: string,
  ): Promise<void> {
    const sessions = await this.sessionRepository.find({
      where: { userId, isActive: true },
    });

    for (const session of sessions) {
      if (exceptSessionId && session.id === exceptSessionId) {
        continue;
      }
      session.isActive = false;
    }

    await this.sessionRepository.save(sessions);
  }

  /**
   * Marca inactivas las sesiones vencidas (de un usuario o de todos).
   * Devuelve cuántas se cerraron.
   */
  async expireSessions(userId?: string): Promise<number> {
    const result = await this.sessionRepository.update(
      {
        isActive: true,
        expiresAt: LessThan(new Date()),
        ...(userId ? { userId } : {}),
      },
      { isActive: false },
    );
    return result.affected ?? 0;
  }

  /**
   * Cierra la sesión dueña del refresh token (logout de este dispositivo).
   * Un token inválido o de una sesión ya cerrada no es error.
   */
  async closeByRefreshToken(refreshToken: string): Promise<boolean> {
    let payload: { userId: string; sessionId: string };
    try {
      payload = await this.jwtTokenService.verifyRefreshToken(refreshToken);
    } catch {
      return false;
    }
    if (!payload?.sessionId || !payload?.userId) return false;
    const result = await this.sessionRepository.update(
      {
        id: payload.sessionId,
        userId: payload.userId,
        refreshToken: this.hashToken(refreshToken),
        isActive: true,
      },
      { isActive: false },
    );
    return (result.affected ?? 0) > 0;
  }

  /**
   * Actualizar última actividad de la sesión
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId, isActive: true },
      { lastActivityAt: new Date() },
    );
  }

  /**
   * Verificar si una sesión es válida
   */
  async isSessionValid(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId, isActive: true },
    });

    if (!session) {
      return false;
    }

    // Verificar que no haya expirado
    if (new Date() > session.expiresAt) {
      session.isActive = false;
      await this.sessionRepository.save(session);
      return false;
    }

    return true;
  }

  /**
   * Verificar refresh token
   */
  async verifyRefreshToken(
    refreshToken: string,
  ): Promise<{ userId: string; sessionId: string }> {
    try {
      const payload =
        await this.jwtTokenService.verifyRefreshToken(refreshToken);

      // Buscar sesión
      const session = await this.sessionRepository.findOne({
        where: {
          id: payload.sessionId,
          userId: payload.userId,
          isActive: true,
        },
      });

      if (!session) {
        throw new UnauthorizedException('Sesión inválida o expirada');
      }

      // Verificar que el hash del token coincida
      const tokenHash = this.hashToken(refreshToken);
      if (session.refreshToken !== tokenHash) {
        throw new UnauthorizedException('Token inválido');
      }

      // Verificar que la sesión no haya expirado
      if (new Date() > session.expiresAt) {
        session.isActive = false;
        await this.sessionRepository.save(session);
        throw new UnauthorizedException('Sesión expirada');
      }

      // Actualizar última actividad
      await this.updateSessionActivity(session.id);

      return {
        userId: payload.userId,
        sessionId: payload.sessionId,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  /**
   * Hash de token para almacenamiento seguro
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
