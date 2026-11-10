import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppModulesService } from '../services/app-modules.service';
import { UpdateAppModuleDto } from '../dto/update-app-module.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';

interface AuthenticatedRequest extends Request {
  user: { id: string; organizationId?: string | null };
}

@Controller('modulos')
@UseGuards(JwtAuthGuard)
export class AppModulesController {
  constructor(private readonly appModulesService: AppModulesService) {}

  /**
   * GET /modulos
   * Catálogo de aplicaciones con su estado efectivo para el scope del usuario.
   * Lo consume cualquier usuario autenticado (sidebar, guardas de rutas).
   */
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.appModulesService.findAllForScope(req.user?.organizationId);
  }

  /**
   * PATCH /modulos/:code
   * Activa/desactiva un módulo para el scope del usuario.
   */
  @Patch(':code')
  @UseGuards(PermissionsGuard)
  @RequirePermission('CONFIGURACION.SISTEMA.EDITAR')
  update(
    @Param('code') code: string,
    @Body() dto: UpdateAppModuleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.appModulesService.updateModuleState(
      code,
      dto.enabled,
      req.user?.organizationId,
      req.user?.id,
    );
  }
}
