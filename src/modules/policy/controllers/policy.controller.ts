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
  PolicyService,
  type CreatePolicyDto,
  type UpdatePolicyDto,
  type PolicyFilters,
  type TestPolicyDto,
} from '../services/policy.service';

@Controller('policies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  /**
   * GET /policies
   * Lista políticas (admin)
   */
  @Get()
  @RequirePermission('POLICY.READ')
  async listPolicies(
    @Query('organizationId') organizationId?: string,
    @Query('isActive') isActive?: string,
    @Query('module') module?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: string,
  ) {
    const filters: PolicyFilters = {
      organizationId,
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      module,
      resource,
      action,
    };

    const policies = await this.policyService.listPolicies(filters);

    return {
      success: true,
      data: policies,
      count: policies.length,
    };
  }

  /**
   * POST /policies
   * Crea una política (admin)
   */
  @Post()
  @RequirePermission('POLICY.CREATE')
  async createPolicy(
    @Body() createPolicyDto: CreatePolicyDto,
    @Req() req: any,
  ) {
    const policy = await this.policyService.createPolicy(
      createPolicyDto,
      req.user.id,
    );

    return {
      success: true,
      data: policy,
    };
  }

  /**
   * GET /policies/:id
   * Obtiene una política (admin)
   */
  @Get(':id')
  @RequirePermission('POLICY.READ')
  async getPolicy(@Param('id') id: string) {
    const policy = await this.policyService.getPolicy(id);

    return {
      success: true,
      data: policy,
    };
  }

  /**
   * PUT /policies/:id
   * Actualiza una política (admin)
   */
  @Put(':id')
  @RequirePermission('POLICY.UPDATE')
  async updatePolicy(
    @Param('id') id: string,
    @Body() updatePolicyDto: UpdatePolicyDto,
    @Req() req: any,
  ) {
    const policy = await this.policyService.updatePolicy(
      id,
      updatePolicyDto,
      req.user.id,
    );

    return {
      success: true,
      data: policy,
    };
  }

  /**
   * DELETE /policies/:id
   * Elimina una política (admin)
   */
  @Delete(':id')
  @RequirePermission('POLICY.DELETE')
  async deletePolicy(@Param('id') id: string) {
    await this.policyService.deletePolicy(id);

    return {
      success: true,
      message: `Policy ${id} deleted successfully`,
    };
  }

  /**
   * POST /policies/:id/test
   * Prueba una política con datos simulados (admin)
   */
  @Post(':id/test')
  @RequirePermission('POLICY.TEST')
  async testPolicy(@Param('id') id: string, @Body() testData: TestPolicyDto) {
    const result = await this.policyService.testPolicy(id, testData);

    return {
      success: true,
      data: result,
    };
  }
}
