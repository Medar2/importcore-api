import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { CreateRoleDto, UpdateRoleDto } from '../dto/security-management.dto';
import { AuditService } from '../../audit/services/audit.service';

export interface AuditActor {
  id?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private auditService: AuditService,
  ) {}

  async create(createRoleDto: CreateRoleDto, actor?: AuditActor) {
    const { permissionIds, ...roleData } = createRoleDto;

    // Verificar si ya existe un rol con ese nombre
    const existing = await this.roleRepository.findOne({
      where: { name: roleData.name },
    });
    if (existing) {
      throw new ConflictException(`Ya existe un rol con el nombre "${roleData.name}"`);
    }

    const role = this.roleRepository.create(roleData);

    if (permissionIds && permissionIds.length > 0) {
      const permissions = await this.permissionRepository.findBy({
        id: In(permissionIds),
      });
      role.permissions = permissions;
    }

    const savedRole = await this.roleRepository.save(role);

    // Registro de auditoría
    if (actor) {
      await this.auditService.logAccess({
        userId: actor.id || 'system',
        userEmail: actor.email || 'system',
        action: 'ROLE_CREATED',
        resource: 'ROLE',
        resourceId: savedRole.id,
        result: 'success',
        metadata: {
          roleName: savedRole.name,
          roleDescription: savedRole.description,
          assignedPermissionsCount: savedRole.permissions?.length || 0,
          permissionCodes: savedRole.permissions?.map((p) => p.code) || [],
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }

    return this.findOne(savedRole.id);
  }

  async findAll() {
    return this.roleRepository.find({ relations: ['permissions'] });
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto, actor?: AuditActor) {
    const role = await this.findOne(id);
    const { permissionIds, name, description, color } = updateRoleDto;

    if (name && name !== role.name) {
      if (role.isSystemRole || role.isSystem) {
        throw new BadRequestException('No se puede cambiar el nombre de un rol del sistema');
      }
      const existing = await this.roleRepository.findOne({
        where: { name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Ya existe un rol con el nombre "${name}"`);
      }
      role.name = name;
    }

    if (description !== undefined) {
      role.description = description;
    }

    if (color !== undefined) {
      role.color = color;
    }

    if (permissionIds !== undefined) {
      if (permissionIds.length > 0) {
        const permissions = await this.permissionRepository.findBy({
          id: In(permissionIds),
        });
        role.permissions = permissions;
      } else {
        role.permissions = [];
      }
    }

    const updatedRole = await this.roleRepository.save(role);

    // Registro de auditoría
    if (actor) {
      await this.auditService.logAccess({
        userId: actor.id || 'system',
        userEmail: actor.email || 'system',
        action: 'ROLE_UPDATED',
        resource: 'ROLE',
        resourceId: id,
        result: 'success',
        metadata: {
          roleName: updatedRole.name,
          updatedFields: {
            name: name !== undefined ? name : undefined,
            description: description !== undefined ? description : undefined,
            color: color !== undefined ? color : undefined,
            permissionCount: updatedRole.permissions?.length || 0,
            permissionCodes: updatedRole.permissions?.map((p) => p.code) || [],
          },
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }

    return this.findOne(id);
  }

  async updatePermissions(id: string, permissionIds: string[], actor?: AuditActor) {
    const role = await this.findOne(id);
    const permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    });
    role.permissions = permissions;
    const saved = await this.roleRepository.save(role);

    if (actor) {
      await this.auditService.logAccess({
        userId: actor.id || 'system',
        userEmail: actor.email || 'system',
        action: 'ROLE_PERMISSIONS_UPDATED',
        resource: 'ROLE',
        resourceId: id,
        result: 'success',
        metadata: {
          roleName: role.name,
          permissionCount: permissions.length,
          permissionCodes: permissions.map((p) => p.code),
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }

    return saved;
  }

  async delete(id: string, actor?: AuditActor) {
    const role = await this.findOne(id);

    if (role.isSystemRole || role.isSystem) {
      throw new BadRequestException('No se puede eliminar un rol del sistema');
    }

    await this.roleRepository.remove(role);

    if (actor) {
      await this.auditService.logAccess({
        userId: actor.id || 'system',
        userEmail: actor.email || 'system',
        action: 'ROLE_DELETED',
        resource: 'ROLE',
        resourceId: id,
        result: 'success',
        metadata: {
          roleName: role.name,
        },
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
      });
    }

    return { success: true, message: `Rol "${role.name}" eliminado correctamente` };
  }
}
