import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionVerificationService } from '../../rbac/services/permission-verification.service';
import { RBACService } from '../../rbac/services/rbac.service';
import { UsersService } from '../services/users.service';
import { UserPermission } from '../entities/user-permission.entity';

export interface DirectUserPermission {
  id: string;
  code: string;
  startsAt: Date | null;
  expiresAt: Date | null;
}

/** Lectura y asignación directa de permisos (roles siguen en UsersController). */
@Injectable()
export class UserAccessService {
  constructor(
    private readonly users: UsersService,
    private readonly effective: PermissionVerificationService,
    private readonly rbac: RBACService,
    @InjectRepository(UserPermission)
    private readonly direct: Repository<UserPermission>,
  ) {}

  async getAccess(userId: string) {
    const user = await this.users.findOne(userId);
    const [effectivePermissions, rows] = await Promise.all([
      this.effective.getUserPermissions(userId),
      this.direct.find({ where: { userId }, relations: ['permission'] }),
    ]);
    const directPermissions: DirectUserPermission[] = rows
      .filter((r) => r.permission?.code)
      .map((r) => ({
        id: r.id,
        code: r.permission.code,
        startsAt: r.startsAt ?? null,
        expiresAt: r.expiresAt ?? null,
      }));
    return {
      userId,
      isSuperAdmin: user.isSuperAdmin,
      roles: (user.roles ?? []).map((r) => ({ id: r.id, name: r.name, description: r.description })),
      effectivePermissions,
      directPermissions,
    };
  }

  assignDirect(userId: string, permissionCode: string) {
    return this.rbac.assignPermissionToUser(userId, permissionCode, {});
  }

  revokeDirect(userPermissionId: string) {
    return this.rbac.revokeUserPermission(userPermissionId);
  }
}
