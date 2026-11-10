import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../security/entities/user.entity';
import { Permission } from '../../security/entities/permission.entity';
import { UserPermission } from '../../security/entities/user-permission.entity';
import { RolePermission } from '../../security/entities/role-permission.entity';
import { PermissionDelegation } from '../../security/entities/permission-delegation.entity';
import { CacheService } from '../../cache/cache.service';

export interface PermissionContext {
  organizationId?: string;
  projectId?: string;
  resourceId?: string;
  [key: string]: any;
}

export interface UserPermissionInfo {
  code: string;
  source: 'role' | 'direct' | 'delegated';
  context?: PermissionContext;
  startsAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class PermissionVerificationService {
  private readonly logger = new Logger(PermissionVerificationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserPermission)
    private readonly userPermissionRepository: Repository<UserPermission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(PermissionDelegation)
    private readonly delegationRepository: Repository<PermissionDelegation>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Verifica si un usuario tiene un permiso específico con contexto opcional
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
    context?: PermissionContext,
  ): Promise<boolean> {
    try {
      this.logger.debug(
        `Checking permission ${permissionCode} for user ${userId} with context: ${JSON.stringify(context)}`,
      );

      const user = await this.userRepository.findOne({
        where: { id: userId },
        select: ['id', 'isSuperAdmin'],
      });
      if (user?.isSuperAdmin) {
        return true;
      }

      // Obtener todos los permisos del usuario
      const userPermissions = await this.getUserPermissions(userId);

      // Verificar si algún permiso del usuario coincide con el requerido
      const hasPermission = this.checkPermissionMatch(
        permissionCode,
        userPermissions,
        context,
      );

      this.logger.debug(
        `Permission check result for ${permissionCode}: ${hasPermission}`,
      );

      return hasPermission;
    } catch (error) {
      this.logger.error(
        `Error in hasPermission: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene todos los permisos de un usuario (roles + directos + delegados)
   */
  async getUserPermissions(userId: string): Promise<UserPermissionInfo[]> {
    this.logger.debug(`Getting all permissions for user ${userId}`);

    const permissions: UserPermissionInfo[] = [];
    const now = new Date();

    // 1. Obtener permisos de roles
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'roles',
        'roles.permissions',
        'roles.rolePermissions',
        'roles.rolePermissions.permission',
      ],
    });

    if (user) {
      const seen = new Set<string>();
      for (const role of user.roles) {
        for (const rolePermission of role.rolePermissions || []) {
          if (
            rolePermission.permission &&
            !seen.has(rolePermission.permission.code)
          ) {
            seen.add(rolePermission.permission.code);
            permissions.push({
              code: rolePermission.permission.code,
              source: 'role',
              context: rolePermission.context || undefined,
            });
          }
        }

        for (const permission of role.permissions || []) {
          if (permission?.code && !seen.has(permission.code)) {
            seen.add(permission.code);
            permissions.push({
              code: permission.code,
              source: 'role',
            });
          }
        }
      }
    }

    // 2. Obtener permisos directos (incluyendo temporales y provisionales)
    const directPermissions = await this.userPermissionRepository.find({
      where: { userId },
      relations: ['permission'],
    });

    for (const userPermission of directPermissions) {
      // Verificar si el permiso está activo
      if (this.isPermissionActive(userPermission)) {
        permissions.push({
          code: userPermission.permission.code,
          source: 'direct',
          context: userPermission.context || undefined,
          startsAt: userPermission.startsAt || undefined,
          expiresAt: userPermission.expiresAt || undefined,
        });
      }
    }

    // 3. Obtener permisos delegados
    const delegations = await this.delegationRepository.find({
      where: {
        delegateId: userId,
        isActive: true,
      },
    });

    for (const delegation of delegations) {
      // Verificar que la delegación esté dentro del período válido
      if (delegation.startsAt <= now && delegation.expiresAt > now) {
        for (const permissionCode of delegation.permissionCodes) {
          permissions.push({
            code: permissionCode,
            source: 'delegated',
            startsAt: delegation.startsAt,
            expiresAt: delegation.expiresAt,
          });
        }
      }
    }

    this.logger.debug(
      `Found ${permissions.length} total permissions for user ${userId}`,
    );

    return permissions;
  }

  /**
   * Verifica si un permiso requerido coincide con los permisos del usuario
   * Soporta wildcards y contextos
   */
  checkPermissionMatch(
    requiredPermission: string,
    userPermissions: UserPermissionInfo[],
    context?: PermissionContext,
  ): boolean {
    for (const userPermission of userPermissions) {
      // Verificar match con wildcards
      if (this.wildcardMatch(userPermission.code, requiredPermission)) {
        // Si hay contexto, verificar compatibilidad
        if (context && userPermission.context) {
          if (this.contextMatches(userPermission.context, context)) {
            return true;
          }
        } else {
          // Si no hay contexto o el permiso no tiene contexto, permitir
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Verifica si un patrón de permiso con wildcards coincide con un permiso específico
   * Ejemplos:
   * - USERS.*.READ coincide con USERS.PROFILE.READ
   * - USERS.PROFILE.* coincide con USERS.PROFILE.READ
   * - USERS.*.* coincide con USERS.PROFILE.READ
   */
  wildcardMatch(pattern: string, permission: string): boolean {
    const patternParts = pattern.split('.');
    const permissionParts = permission.split('.');

    // Ambos deben tener 3 partes (MODULO.RECURSO.ACCION)
    if (patternParts.length !== 3 || permissionParts.length !== 3) {
      return false;
    }

    // Comparar cada parte
    for (let i = 0; i < 3; i++) {
      const patternPart = patternParts[i];
      const permissionPart = permissionParts[i];

      // Si el patrón tiene wildcard, coincide con cualquier cosa
      if (patternPart === '*') {
        continue;
      }

      // Si no es wildcard, debe coincidir exactamente
      if (patternPart !== permissionPart) {
        return false;
      }
    }

    return true;
  }

  /**
   * Verifica si el contexto de un permiso es compatible con el contexto de la solicitud
   * El contexto del permiso debe coincidir o ser más general que el contexto solicitado
   */
  contextMatches(
    permissionContext: PermissionContext,
    requestContext: PermissionContext,
  ): boolean {
    // Si el permiso tiene organizationId, debe coincidir
    if (
      permissionContext.organizationId &&
      requestContext.organizationId &&
      permissionContext.organizationId !== requestContext.organizationId
    ) {
      return false;
    }

    // Si el permiso tiene projectId, debe coincidir
    if (
      permissionContext.projectId &&
      requestContext.projectId &&
      permissionContext.projectId !== requestContext.projectId
    ) {
      return false;
    }

    // Si el permiso tiene resourceId, debe coincidir
    if (
      permissionContext.resourceId &&
      requestContext.resourceId &&
      permissionContext.resourceId !== requestContext.resourceId
    ) {
      return false;
    }

    // Verificar otros campos del contexto
    for (const key in permissionContext) {
      if (
        key !== 'organizationId' &&
        key !== 'projectId' &&
        key !== 'resourceId'
      ) {
        if (
          requestContext[key] !== undefined &&
          permissionContext[key] !== requestContext[key]
        ) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Verifica si un permiso está activo (validez temporal)
   * Verifica startsAt <= now < expiresAt
   */
  isPermissionActive(permission: UserPermission): boolean {
    const now = new Date();

    // Si tiene startsAt, verificar que ya haya comenzado
    if (permission.startsAt && permission.startsAt > now) {
      return false;
    }

    // Si tiene expiresAt, verificar que no haya expirado
    if (permission.expiresAt && permission.expiresAt <= now) {
      return false;
    }

    // Si es provisional, verificar que esté aprobado
    if (permission.type === 'provisional') {
      if (permission.approvalStatus !== 'approved') {
        return false;
      }
    }

    return true;
  }
}
