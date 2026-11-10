import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import {
  OrganizationService,
  type CreateOrganizationDto,
  type UpdateOrganizationDto,
  type OrganizationFilters,
  type OrganizationSettings,
} from '../services/organization.service';

@Controller('organizations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * GET /organizations
   * Lista organizaciones (admin)
   */
  @Get()
  @RequirePermission('ORGANIZATION.READ')
  async listOrganizations(
    @Query('isActive') isActive?: string,
    @Query('parentId') parentId?: string,
  ) {
    const filters: OrganizationFilters = {
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      parentId,
    };

    const organizations =
      await this.organizationService.listOrganizations(filters);

    return {
      success: true,
      data: organizations,
      count: organizations.length,
    };
  }

  /**
   * POST /organizations
   * Crea una organización (superadmin)
   */
  @Post()
  @RequirePermission('ORGANIZATION.CREATE')
  async createOrganization(
    @Body() createOrgDto: CreateOrganizationDto,
    @Req() req: any,
  ) {
    const organization = await this.organizationService.createOrganization(
      createOrgDto,
      req.user.id,
    );

    return {
      success: true,
      data: organization,
    };
  }

  /**
   * GET /organizations/:id
   * Obtiene una organización
   */
  @Get(':id')
  @RequirePermission('ORGANIZATION.READ')
  async getOrganization(@Param('id') id: string) {
    const organization = await this.organizationService.getOrganization(id);

    return {
      success: true,
      data: organization,
    };
  }

  /**
   * PUT /organizations/:id
   * Actualiza una organización (admin)
   */
  @Put(':id')
  @RequirePermission('ORGANIZATION.UPDATE')
  async updateOrganization(
    @Param('id') id: string,
    @Body() updateOrgDto: UpdateOrganizationDto,
    @Req() req: any,
  ) {
    const organization = await this.organizationService.updateOrganization(
      id,
      updateOrgDto,
      req.user.id,
    );

    return {
      success: true,
      data: organization,
    };
  }

  /**
   * DELETE /organizations/:id
   * Elimina una organización (superadmin)
   */
  @Delete(':id')
  @RequirePermission('ORGANIZATION.DELETE')
  async deleteOrganization(@Param('id') id: string) {
    await this.organizationService.deleteOrganization(id);

    return {
      success: true,
      message: `Organization ${id} deleted successfully`,
    };
  }

  /**
   * GET /organizations/:id/users
   * Lista usuarios de una organización (admin)
   */
  @Get(':id/users')
  @RequirePermission('ORGANIZATION.USERS.READ')
  async getOrganizationUsers(@Param('id') id: string) {
    const users = await this.organizationService.getOrganizationUsers(id);

    return {
      success: true,
      data: users,
      count: users.length,
    };
  }

  /**
   * PUT /organizations/:id/settings
   * Actualiza la configuración de una organización (admin)
   */
  @Put(':id/settings')
  @RequirePermission('ORGANIZATION.SETTINGS.UPDATE')
  async updateOrganizationSettings(
    @Param('id') id: string,
    @Body() settings: OrganizationSettings,
  ) {
    const organization =
      await this.organizationService.updateOrganizationSettings(id, settings);

    return {
      success: true,
      data: organization.settings,
    };
  }

  /**
   * GET /organizations/:id/settings
   * Obtiene la configuración de una organización
   */
  @Get(':id/settings')
  @RequirePermission('ORGANIZATION.SETTINGS.READ')
  async getOrganizationSettings(@Param('id') id: string) {
    const settings = await this.organizationService.getOrganizationSettings(id);

    return {
      success: true,
      data: settings,
    };
  }
}
