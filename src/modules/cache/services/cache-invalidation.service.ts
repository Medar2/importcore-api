import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CacheService } from '../cache.service';
import { UserPermission } from '../../security/entities/user-permission.entity';
import { PermissionDelegation } from '../../security/entities/permission-delegation.entity';
import { Session } from '../../security/entities/session.entity';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(
    private readonly cacheService: CacheService,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
    @InjectRepository(PermissionDelegation)
    private readonly delegationRepository: Repository<PermissionDelegation>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  /**
   * Invalida el caché de permisos de un usuario
   */
  async invalidateUserPermissions(userId: string): Promise<void> {
    this.logger.debug(`Invalidating permissions cache for user ${userId}`);
    await this.cacheService.invalidateUserCache(userId);
  }

  /**
   * Invalida el caché de un rol y todos los usuarios con ese rol
   */
  async invalidateRole(roleId: string): Promise<void> {
    this.logger.debug(`Invalidating cache for role ${roleId}`);

    // Invalidar caché del rol
    await this.cacheService.invalidateRoleCache(roleId);

    // TODO: Invalidar caché de todos los usuarios con este rol
    // Esto requiere una consulta adicional a la base de datos
  }

  /**
   * Invalida el caché de políticas
   */
  async invalidatePolicy(
    policyId: string,
    organizationId?: string,
  ): Promise<void> {
    this.logger.debug(`Invalidating policy cache for policy ${policyId}`);

    if (organizationId) {
      await this.cacheService.invalidatePolicyCache(organizationId);
    }
  }

  /**
   * Invalida el caché de sesión
   */
  async invalidateSession(sessionId: string): Promise<void> {
    this.logger.debug(`Invalidating session cache for session ${sessionId}`);
    await this.cacheService.invalidateSessionCache(sessionId);
  }

  /**
   * Cron job para invalidar permisos expirados
   * Se ejecuta cada hora
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredPermissions(): Promise<void> {
    this.logger.log('Running cleanup of expired permissions cache...');

    const now = new Date();

    try {
      // Buscar permisos expirados
      const expiredPermissions = await this.userPermissionRepository.find({
        where: {
          expiresAt: LessThan(now),
        },
      });

      if (expiredPermissions.length === 0) {
        this.logger.log('No expired permissions found');
        return;
      }

      // Recopilar IDs de usuarios afectados
      const affectedUserIds = new Set<string>();
      expiredPermissions.forEach((perm) => affectedUserIds.add(perm.userId));

      // Invalidar caché de usuarios afectados
      for (const userId of affectedUserIds) {
        await this.cacheService.invalidateUserCache(userId);
      }

      this.logger.log(
        `Invalidated cache for ${affectedUserIds.size} users with expired permissions`,
      );
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired permissions cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cron job para invalidar delegaciones expiradas
   * Se ejecuta cada hora
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredDelegations(): Promise<void> {
    this.logger.log('Running cleanup of expired delegations cache...');

    const now = new Date();

    try {
      // Buscar delegaciones expiradas
      const expiredDelegations = await this.delegationRepository.find({
        where: {
          expiresAt: LessThan(now),
          isActive: true,
        },
      });

      if (expiredDelegations.length === 0) {
        this.logger.log('No expired delegations found');
        return;
      }

      // Recopilar IDs de delegates afectados
      const affectedDelegateIds = new Set<string>();
      expiredDelegations.forEach((delegation) => {
        affectedDelegateIds.add(delegation.delegateId);
      });

      // Invalidar caché de delegates afectados
      for (const delegateId of affectedDelegateIds) {
        await this.cacheService.invalidateUserCache(delegateId);
      }

      this.logger.log(
        `Invalidated cache for ${affectedDelegateIds.size} users with expired delegations`,
      );
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired delegations cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Cron job para limpiar sesiones expiradas del caché
   * Se ejecuta cada 15 minutos
   */
  @Cron('*/15 * * * *') // Every 15 minutes
  async handleExpiredSessions(): Promise<void> {
    this.logger.log('Running cleanup of expired sessions cache...');

    const now = new Date();

    try {
      // Buscar sesiones expiradas
      const expiredSessions = await this.sessionRepository.find({
        where: {
          expiresAt: LessThan(now),
          isActive: true,
        },
      });

      if (expiredSessions.length === 0) {
        this.logger.log('No expired sessions found');
        return;
      }

      // Invalidar caché de sesiones expiradas
      for (const session of expiredSessions) {
        await this.cacheService.invalidateSessionCache(session.id);
      }

      this.logger.log(
        `Invalidated cache for ${expiredSessions.length} expired sessions`,
      );
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired sessions cache: ${error.message}`,
        error.stack,
      );
    }
  }
}
