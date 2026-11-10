import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { UserAccessService } from '../application/user-access.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserAccessController {
  constructor(private readonly access: UserAccessService) {}

  @Get(':id/access')
  @RequirePermission('ADMINISTRACION.USUARIOS.VER')
  getAccess(@Param('id', ParseUUIDPipe) id: string) {
    return this.access.getAccess(id);
  }

  @Post(':id/access/permissions')
  @RequirePermission('ADMINISTRACION.PERMISOS.ASIGNAR')
  assignDirect(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('permissionCode') permissionCode: string,
  ) {
    return this.access.assignDirect(id, permissionCode);
  }

  @Delete(':id/access/permissions/:userPermissionId')
  @RequirePermission('ADMINISTRACION.PERMISOS.REVOCAR')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeDirect(@Param('userPermissionId', ParseUUIDPipe) userPermissionId: string) {
    return this.access.revokeDirect(userPermissionId);
  }
}
