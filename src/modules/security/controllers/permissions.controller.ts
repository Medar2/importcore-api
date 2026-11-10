import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsService } from '../services/permissions.service';
import { CreatePermissionDto } from '../dto/security-management.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Post()
  @RequirePermission('ADMINISTRACION.PERMISOS.ASIGNAR')
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @Get()
  @RequirePermission('ADMINISTRACION.PERMISOS.VER')
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @RequirePermission('ADMINISTRACION.PERMISOS.VER')
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }
}
