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
import { Role } from '../../security/entities/role.entity';
import { Permission } from '../../security/entities/permission.entity';
import { UserPermission } from '../../security/entities/user-permission.entity';
import { RolePermission } from '../../security/entities/role-permission.entity';
import { CacheService } from '../../cache/cache.service';
import { AuditService } from '../../audit/services/audit.service';

export interface AssignPermissionOptions {
  context?: {
    organizationId?: string;
    projectId?: string;
    resourceId?: string;
    [key: string]: any;
  };
  type?: 'direct' | 'provisional' | 'temporary';
  startsAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class RBACService {
  private readonly logger = new Logger(RBACService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
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
   * Asigna un permiso directo a un usuario con contexto opcional
   */
  async assignPermissionToUser(
    userId: string,
    permissionCode: string,
    options?: AssignPermissionOptions,
  ): Promise<UserPermission> {
    this.logger.log(`Assigning permission ${permissionCode} to user ${userId}`);

    // Validar formato del permiso
    this.validatePermissionFormat(permissionCode);

    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Buscar el permiso por código
    const permission = await this.permissionRepository.findOne({
      where: { code: permissionCode },
    });
    if (!permission) {
      throw new NotFoundException(
        `Permission with code ${permissionCode} not found`,
      );
    }

    // Verificar si ya existe el permiso asignado
    const existingPermission = await this.userPermissionRepository.findOne({
      where: {
        userId,
        permissionId: permission.id,
      },
    });

    if (existingPermission) {
      throw new BadRequestException(
        `Permission ${permissionCode} is already assigned to user ${userId}`,
      );
    }

    // Crear el permiso de usuario
    const userPermission = this.userPermissionRepository.create({
      userId,
      permissionId: permission.id,
      type: options?.type || 'direct',
      context: options?.context || null,
      startsAt: options?.startsAt || null,
      expiresAt: options?.expiresAt || null,
    });

    const savedPermission =
      await this.userPermissionRepository.save(userPermission);

    // Invalidar caché del usuario
    await this.cacheService.invalidateUserCache(userId);

    // Log PERMISSION_GRANTED
    await this.auditService.logPermissionChange({
      userId: user.id,
      userEmail: user.username,
      organizationId: user.organizationId || undefined,
      action: 'PERMISSION_GRANTED',
      resource: 'USER_PERMISSION',
      resourceId: savedPermission.id,
      metadata: {
        permissionCode,
        type: options?.type || 'direct',
        context: options?.context,
        startsAt: options?.startsAt?.toISOString(),
        expiresAt: options?.expiresAt?.toISOString(),
      },
    });

    this.logger.log(
      `Permission ${permissionCode} assigned to user ${userId} successfully`,
    );

    return savedPermission;
  }

  /**
   * Asigna un permiso a un rol con contexto opcional
   */
  async assignPermissionToRole(
    roleId: string,
    permissionCode: string,
    context?: {
      organizationId?: string;
      projectId?: string;
      resourceId?: string;
      [key: string]: any;
    },
  ): Promise<RolePermission> {
    this.logger.log(`Assigning permission ${permissionCode} to role ${roleId}`);

    // Validar formato del permiso
    this.validatePermissionFormat(permissionCode);

    // Verificar que el rol existe
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Buscar el permiso por código
    const permission = await this.permissionRepository.findOne({
      where: { code: permissionCode },
    });
    if (!permission) {
      throw new NotFoundException(
        `Permission with code ${permissionCode} not found`,
      );
    }

    // Verificar si ya existe el permiso asignado al rol
    const existingPermission = await this.rolePermissionRepository.findOne({
      where: {
        roleId,
        permissionId: permission.id,
      },
    });

    if (existingPermission) {
      throw new BadRequestException(
        `Permission ${permissionCode} is already assigned to role ${roleId}`,
      );
    }

    // Crear el permiso de rol
    const rolePermission = this.rolePermissionRepository.create({
      roleId,
      permissionId: permission.id,
      context: context || null,
    });

    const savedPermission =
      await this.rolePermissionRepository.save(rolePermission);

    // Invalidar caché del rol
    await this.cacheService.invalidateRoleCache(roleId);

    // Invalidar caché de todos los usuarios con este rol
    const usersWithRole = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.id = :roleId', { roleId })
      .getMany();

    for (const user of usersWithRole) {
      await this.cacheService.invalidateUserCache(user.id);
    }

    this.logger.log(
      `Permission ${permissionCode} assigned to role ${roleId} successfully`,
    );

    return savedPermission;
  }

  /**
   * Revoca un permiso directo de un usuario
   */
  async revokeUserPermission(userPermissionId: string): Promise<void> {
    this.logger.log(`Revoking user permission ${userPermissionId}`);

    // Buscar el permiso de usuario
    const userPermission = await this.userPermissionRepository.findOne({
      where: { id: userPermissionId },
    });

    if (!userPermission) {
      throw new NotFoundException(
        `User permission with ID ${userPermissionId} not found`,
      );
    }

    const userId = userPermission.userId;

    // Obtener información del usuario para el log
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const permission = await this.permissionRepository.findOne({
      where: { id: userPermission.permissionId },
    });

    // Eliminar el permiso
    await this.userPermissionRepository.remove(userPermission);

    // Invalidar caché del usuario
    await this.cacheService.invalidateUserCache(userId);

    // Log PERMISSION_REVOKED
    if (user && permission) {
      await this.auditService.logPermissionChange({
        userId: user.id,
        userEmail: user.username,
        organizationId: user.organizationId || undefined,
        action: 'PERMISSION_REVOKED',
        resource: 'USER_PERMISSION',
        resourceId: userPermissionId,
        metadata: {
          permissionCode: permission.code,
          type: userPermission.type,
        },
      });
    }

    this.logger.log(`User permission ${userPermissionId} revoked successfully`);
  }

  /**
   * Revoca un permiso de un rol
   */
  async revokeRolePermission(rolePermissionId: string): Promise<void> {
    this.logger.log(`Revoking role permission ${rolePermissionId}`);

    // Buscar el permiso de rol
    const rolePermission = await this.rolePermissionRepository.findOne({
      where: { id: rolePermissionId },
    });

    if (!rolePermission) {
      throw new NotFoundException(
        `Role permission with ID ${rolePermissionId} not found`,
      );
    }

    const roleId = rolePermission.roleId;

    // Eliminar el permiso
    await this.rolePermissionRepository.remove(rolePermission);

    // Invalidar caché del rol
    await this.cacheService.invalidateRoleCache(roleId);

    // Invalidar caché de todos los usuarios con este rol
    const usersWithRole = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.id = :roleId', { roleId })
      .getMany();

    for (const user of usersWithRole) {
      await this.cacheService.invalidateUserCache(user.id);
    }

    this.logger.log(`Role permission ${rolePermissionId} revoked successfully`);
  }

  /**
   * Asigna un rol a un usuario
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    this.logger.log(`Assigning role ${roleId} to user ${userId}`);

    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verificar que el rol existe
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    // Verificar si el usuario ya tiene el rol
    const hasRole = user.roles.some((r) => r.id === roleId);
    if (hasRole) {
      throw new BadRequestException(
        `User ${userId} already has role ${roleId}`,
      );
    }

    // Asignar el rol
    user.roles.push(role);
    await this.userRepository.save(user);

    // Invalidar caché del usuario
    await this.cacheService.invalidateUserCache(userId);

    // Log ROLE_ASSIGNED
    await this.auditService.logPermissionChange({
      userId: user.id,
      userEmail: user.username,
      organizationId: user.organizationId || undefined,
      action: 'ROLE_ASSIGNED',
      resource: 'USER_ROLE',
      resourceId: roleId,
      metadata: {
        roleName: role.name,
        roleId,
      },
    });

    this.logger.log(`Role ${roleId} assigned to user ${userId} successfully`);
  }

  /**
   * Revoca un rol de un usuario
   */
  async revokeRoleFromUser(userId: string, roleId: string): Promise<void> {
    this.logger.log(`Revoking role ${roleId} from user ${userId}`);

    // Verificar que el usuario existe
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Verificar si el usuario tiene el rol
    const roleIndex = user.roles.findIndex((r) => r.id === roleId);
    if (roleIndex === -1) {
      throw new BadRequestException(
        `User ${userId} does not have role ${roleId}`,
      );
    }

    // Revocar el rol
    user.roles.splice(roleIndex, 1);
    await this.userRepository.save(user);

    // Invalidar caché del usuario
    await this.cacheService.invalidateUserCache(userId);

    // Obtener información del rol para el log
    const role = await this.roleRepository.findOne({ where: { id: roleId } });

    // Log ROLE_REVOKED
    if (role) {
      await this.auditService.logPermissionChange({
        userId: user.id,
        userEmail: user.username,
        organizationId: user.organizationId || undefined,
        action: 'ROLE_REVOKED',
        resource: 'USER_ROLE',
        resourceId: roleId,
        metadata: {
          roleName: role.name,
          roleId,
        },
      });
    }

    this.logger.log(`Role ${roleId} revoked from user ${userId} successfully`);
  }

  /**
   * Asigna un permiso temporal a un usuario
   * Valida que startsAt < expiresAt
   */
  async assignTemporalPermission(
    userId: string,
    permissionCode: string,
    startsAt: Date,
    expiresAt: Date,
    context?: {
      organizationId?: string;
      projectId?: string;
      resourceId?: string;
      [key: string]: any;
    },
  ): Promise<UserPermission> {
    this.logger.log(
      `Assigning temporal permission ${permissionCode} to user ${userId} from ${startsAt.toISOString()} to ${expiresAt.toISOString()}`,
    );

    // Validar que startsAt < expiresAt
    if (startsAt >= expiresAt) {
      throw new BadRequestException(
        `Invalid temporal permission: startsAt (${startsAt.toISOString()}) must be before expiresAt (${expiresAt.toISOString()})`,
      );
    }

    // Usar el método existente assignPermissionToUser con opciones temporales
    return this.assignPermissionToUser(userId, permissionCode, {
      type: 'temporary',
      startsAt,
      expiresAt,
      context,
    });
  }

  /**
   * Cron job que se ejecuta cada hora para limpiar permisos expirados
   * Busca permisos con expiresAt < now, los elimina y invalida caché
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredPermissions(): Promise<void> {
    this.logger.log('Running cleanup of expired permissions...');

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

      this.logger.log(
        `Found ${expiredPermissions.length} expired permissions to clean up`,
      );

      // Recopilar IDs de usuarios afectados para invalidar caché
      const affectedUserIds = new Set<string>();
      expiredPermissions.forEach((perm) => affectedUserIds.add(perm.userId));

      // Eliminar permisos expirados
      await this.userPermissionRepository.remove(expiredPermissions);

      // Invalidar caché de usuarios afectados
      for (const userId of affectedUserIds) {
        await this.cacheService.invalidateUserCache(userId);
      }

      this.logger.log(
        `Successfully cleaned up ${expiredPermissions.length} expired permissions. ` +
          `Invalidated cache for ${affectedUserIds.size} users.`,
      );
    } catch (error) {
      this.logger.error(
        `Error cleaning up expired permissions: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Obtiene roles por sus IDs
   */
  async getRolesByIds(ids: string[]): Promise<Role[]> {
    if (!ids || ids.length === 0) return [];
    return this.roleRepository.find({
      where: ids.map((id) => ({ id })),
    });
  }
}
