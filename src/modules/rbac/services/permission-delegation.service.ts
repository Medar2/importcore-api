import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '../../security/entities/user.entity';
import { Permission } from '../../security/entities/permission.entity';
import { PermissionDelegation } from '../../security/entities/permission-delegation.entity';
import { CacheService } from '../../cache/cache.service';
import { AuditService } from '../../audit/services/audit.service';

@Injectable()
export class PermissionDelegationService {
  private readonly logger = new Logger(PermissionDelegationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(PermissionDelegation)
    private readonly delegationRepository: Repository<PermissionDelegation>,
    private readonly cacheService: CacheService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Valida el formato de un código de permiso (MODULO.RECURSO.ACCION)
   */
  private validatePermissionFormat(permissionCode: string): void {
    const parts = permissionCode.split('.');
    if (parts.length !== 3) {
      throw new BadRequestException(
        `Invalid permission format: ${permissionCode}. Expected format: MODULO.RECURSO.ACCION`,
      );
    }

    const [module, resource, action] = parts;
    if (!module || !resource || !action) {
      throw new BadRequestException(
        `Invalid permission format: ${permissionCode}. All parts (MODULO, RECURSO, ACCION) must be non-empty`,
      );
    }
  }

  /**
   * Verifica si un usuario tiene un permiso específico
   * Esto incluye permisos directos, de roles y delegados
   */
  private async userHasPermission(
    userId: string,
    permissionCode: string,
  ): Promise<boolean> {
    // Buscar el permiso por código
    const permission = await this.permissionRepository.findOne({
      where: { code: permissionCode },
    });

    if (!permission) {
      return false;
    }

    // Verificar permisos directos del usuario
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'directPermissions',
        'directPermissions.permission',
        'roles',
        'roles.rolePermissions',
        'roles.rolePermissions.permission',
      ],
    });

    if (!user) {
      return false;
    }

    // Verificar permisos directos
    const hasDirectPermission = user.directPermissions.some(
      (up) => up.permission?.code === permissionCode,
    );

    if (hasDirectPermission) {
      return true;
    }

    // Verificar permisos de roles
    const hasRolePermission = user.roles.some((role) =>
      role.rolePermissions.some((rp) => rp.permission?.code === permissionCode),
    );

    return hasRolePermission;
  }

  /**
   * Delega permisos de un usuario a otro
   * Valida que el delegator tenga los permisos que intenta delegar
   * Valida que startsAt < expiresAt
   */
  async delegatePermissions(
    delegatorId: string,
    delegateId: string,
    permissionCodes: string[],
    startsAt: Date,
    expiresAt: Date,
  ): Promise<PermissionDelegation> {
    this.logger.log(
      `Delegating permissions from user ${delegatorId} to user ${delegateId}: ${permissionCodes.join(', ')}`,
    );

    // Validar que startsAt < expiresAt
    if (startsAt >= expiresAt) {
      throw new BadRequestException(
        `Invalid delegation period: startsAt (${startsAt.toISOString()}) must be before expiresAt (${expiresAt.toISOString()})`,
      );
    }

    // Verificar que el delegator existe
    const delegator = await this.userRepository.findOne({
      where: { id: delegatorId },
    });
    if (!delegator) {
      throw new NotFoundException(
        `Delegator user with ID ${delegatorId} not found`,
      );
    }

    // Verificar que el delegate existe
    const delegate = await this.userRepository.findOne({
      where: { id: delegateId },
    });
    if (!delegate) {
      throw new NotFoundException(
        `Delegate user with ID ${delegateId} not found`,
      );
    }

    // Validar que no se está delegando a sí mismo
    if (delegatorId === delegateId) {
      throw new BadRequestException('Cannot delegate permissions to yourself');
    }

    // Validar formato de todos los permisos
    for (const permissionCode of permissionCodes) {
      this.validatePermissionFormat(permissionCode);
    }

    // Verificar que el delegator tiene todos los permisos que intenta delegar
    const missingPermissions: string[] = [];
    for (const permissionCode of permissionCodes) {
      const hasPermission = await this.userHasPermission(
        delegatorId,
        permissionCode,
      );
      if (!hasPermission) {
        missingPermissions.push(permissionCode);
      }
    }

    if (missingPermissions.length > 0) {
      throw new BadRequestException(
        `Delegator does not have the following permissions: ${missingPermissions.join(', ')}`,
      );
    }

    // Crear la delegación
    const delegation = this.delegationRepository.create({
      delegatorId,
      delegateId,
      permissionCodes,
      startsAt,
      expiresAt,
      isActive: true,
    });

    const savedDelegation = await this.delegationRepository.save(delegation);

    // Invalidar caché del delegate para que los nuevos permisos se reflejen
    await this.cacheService.invalidateUserCache(delegateId);

    // Log DELEGATION_CREATED
    await this.auditService.logPermissionChange({
      userId: delegatorId,
      userEmail: delegator.username,
      organizationId: delegator.organizationId || undefined,
      action: 'PERMISSION_GRANTED',
      resource: 'DELEGATION',
      resourceId: savedDelegation.id,
      metadata: {
        delegateId,
        delegateEmail: delegate.username,
        permissionCodes,
        startsAt: startsAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });

    this.logger.log(
      `Successfully delegated ${permissionCodes.length} permissions from user ${delegatorId} to user ${delegateId}`,
    );

    return savedDelegation;
  }

  /**
   * Revoca una delegación de permisos
   * Registra la razón de revocación
   */
  async revokeDelegation(delegationId: string, reason: string): Promise<void> {
    this.logger.log(
      `Revoking delegation ${delegationId} with reason: ${reason}`,
    );

    // Buscar la delegación
    const delegation = await this.delegationRepository.findOne({
      where: { id: delegationId },
    });

    if (!delegation) {
      throw new NotFoundException(
        `Delegation with ID ${delegationId} not found`,
      );
    }

    // Verificar que la delegación está activa
    if (!delegation.isActive) {
      throw new BadRequestException(
        `Delegation ${delegationId} is already revoked`,
      );
    }

    // Marcar como revocada
    delegation.isActive = false;
    delegation.revokedAt = new Date();
    delegation.revocationReason = reason;

    await this.delegationRepository.save(delegation);

    // Invalidar caché del delegate
    await this.cacheService.invalidateUserCache(delegation.delegateId);

    // Obtener información de usuarios para el log
    const delegator = await this.userRepository.findOne({
      where: { id: delegation.delegatorId },
    });
    const delegate = await this.userRepository.findOne({
      where: { id: delegation.delegateId },
    });

    // Log DELEGATION_REVOKED
    if (delegator && delegate) {
      await this.auditService.logPermissionChange({
        userId: delegation.delegatorId,
        userEmail: delegator.username,
        organizationId: delegator.organizationId || undefined,
        action: 'PERMISSION_REVOKED',
        resource: 'DELEGATION',
        resourceId: delegationId,
        metadata: {
          delegateId: delegation.delegateId,
          delegateEmail: delegate.username,
          permissionCodes: delegation.permissionCodes,
          reason,
        },
      });
    }

    this.logger.log(`Successfully revoked delegation ${delegationId}`);
  }

  /**
   * Obtiene las delegaciones activas de un usuario
   * Incluye tanto las delegaciones recibidas como las otorgadas
   */
  async getActiveDelegations(userId: string): Promise<{
    received: PermissionDelegation[];
    given: PermissionDelegation[];
  }> {
    this.logger.log(`Getting active delegations for user ${userId}`);

    const now = new Date();

    // Delegaciones recibidas (donde el usuario es el delegate)
    const received = await this.delegationRepository.find({
      where: {
        delegateId: userId,
        isActive: true,
      },
      relations: ['delegator', 'delegate'],
    });

    // Filtrar por fecha (startsAt <= now < expiresAt)
    const activeReceived = received.filter(
      (d) => d.startsAt <= now && d.expiresAt > now,
    );

    // Delegaciones otorgadas (donde el usuario es el delegator)
    const given = await this.delegationRepository.find({
      where: {
        delegatorId: userId,
        isActive: true,
      },
      relations: ['delegator', 'delegate'],
    });

    // Filtrar por fecha
    const activeGiven = given.filter(
      (d) => d.startsAt <= now && d.expiresAt > now,
    );

    this.logger.log(
      `Found ${activeReceived.length} received and ${activeGiven.length} given active delegations for user ${userId}`,
    );

    return {
      received: activeReceived,
      given: activeGiven,
    };
  }

  /**
   * Cron job que se ejecuta cada hora para expirar delegaciones
   * Busca delegaciones con expiresAt < now y las marca como inactivas
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireDelegations(): Promise<void> {
    this.logger.log('Running expiration of delegations...');

    const now = new Date();

    try {
      // Buscar delegaciones expiradas que aún están activas
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

      this.logger.log(
        `Found ${expiredDelegations.length} expired delegations to expire`,
      );

      // Recopilar IDs de delegates afectados para invalidar caché
      const affectedDelegateIds = new Set<string>();
      expiredDelegations.forEach((delegation) => {
        affectedDelegateIds.add(delegation.delegateId);
      });

      // Marcar delegaciones como inactivas
      for (const delegation of expiredDelegations) {
        delegation.isActive = false;
      }

      await this.delegationRepository.save(expiredDelegations);

      // Invalidar caché de delegates afectados
      for (const delegateId of affectedDelegateIds) {
        await this.cacheService.invalidateUserCache(delegateId);
      }

      this.logger.log(
        `Successfully expired ${expiredDelegations.length} delegations. ` +
          `Invalidated cache for ${affectedDelegateIds.size} delegates.`,
      );
    } catch (error) {
      this.logger.error(
        `Error expiring delegations: ${error.message}`,
        error.stack,
      );
    }
  }
}
