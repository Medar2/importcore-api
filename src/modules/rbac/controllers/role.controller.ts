import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { RBACService } from '../services/rbac.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../security/entities/role.entity';
import {
  CreateRoleDto,
  UpdateRoleDto,
  AssignPermissionToRoleDto,
} from '../dto';

@Controller('rbac/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(
    private readonly rbacService: RBACService,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  @Get()
  @RequirePermission('RBAC.ROLES.READ')
  async listRoles() {
    const roles = await this.roleRepository.find({
      relations: ['permissions', 'permissions.permission'],
    });
    return { roles };
  }

  @Post()
  @RequirePermission('RBAC.ROLES.CREATE')
  async createRole(@Body() dto: CreateRoleDto) {
    const role = this.roleRepository.create(dto);
    const savedRole = await this.roleRepository.save(role);
    return {
      message: 'Role created successfully',
      role: savedRole,
    };
  }

  @Get(':id')
  @RequirePermission('RBAC.ROLES.READ')
  async getRole(@Param('id') id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions', 'permissions.permission'],
    });
    if (!role) {
      throw new Error('Role not found');
    }
    return { role };
  }

  @Put(':id')
  @RequirePermission('RBAC.ROLES.UPDATE')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new Error('Role not found');
    }

    Object.assign(role, dto);
    const updatedRole = await this.roleRepository.save(role);

    return {
      message: 'Role updated successfully',
      role: updatedRole,
    };
  }

  @Delete(':id')
  @RequirePermission('RBAC.ROLES.DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('id') id: string) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new Error('Role not found');
    }
    await this.roleRepository.softRemove(role);
  }

  @Post(':id/permissions')
  @RequirePermission('RBAC.ROLES.ASSIGN_PERMISSION')
  async assignPermissionToRole(
    @Param('id') roleId: string,
    @Body() dto: AssignPermissionToRoleDto,
  ) {
    const rolePermission = await this.rbacService.assignPermissionToRole(
      roleId,
      dto.permissionCode,
      dto.context,
    );
    return {
      message: 'Permission assigned to role successfully',
      rolePermission,
    };
  }

  @Delete(':id/permissions/:permId')
  @RequirePermission('RBAC.ROLES.REVOKE_PERMISSION')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokePermissionFromRole(
    @Param('id') roleId: string,
    @Param('permId') permissionId: string,
  ) {
    await this.rbacService.revokeRolePermission(permissionId);
  }
}
