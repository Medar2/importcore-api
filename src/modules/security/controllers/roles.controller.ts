import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto, UpdateRoleDto } from '../dto/security-management.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  private extractActor(user: any, req: any) {
    return {
      id: user?.id,
      email: user?.email || user?.person?.email || user?.username,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers ? req.headers['user-agent'] : undefined,
    };
  }

  @Post()
  @RequirePermission('ADMINISTRACION.ROLES.CREAR')
  create(
    @Body() createRoleDto: CreateRoleDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.rolesService.create(createRoleDto, this.extractActor(user, req));
  }

  @Get()
  @RequirePermission('ADMINISTRACION.ROLES.VER')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @RequirePermission('ADMINISTRACION.ROLES.VER')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('ADMINISTRACION.ROLES.EDITAR')
  update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.rolesService.update(id, updateRoleDto, this.extractActor(user, req));
  }

  @Put(':id/permissions')
  @RequirePermission('ADMINISTRACION.PERMISOS.ASIGNAR')
  updatePermissions(
    @Param('id') id: string,
    @Body('permissionIds') permissionIds: string[],
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.rolesService.updatePermissions(id, permissionIds, this.extractActor(user, req));
  }

  @Delete(':id')
  @RequirePermission('ADMINISTRACION.ROLES.ELIMINAR')
  delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.rolesService.delete(id, this.extractActor(user, req));
  }
}
