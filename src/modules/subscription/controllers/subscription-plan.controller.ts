import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionPlanService } from '../services/subscription-plan.service';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from '../dto/subscription-plan.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';

@Controller('subscription-plans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionPlanController {
  constructor(private planService: SubscriptionPlanService) {}

  @Post()
  @RequirePermission('SUBSCRIPTION.PLANS.CREATE')
  create(@Body() createDto: CreateSubscriptionPlanDto) {
    return this.planService.create(createDto);
  }

  @Get()
  @RequirePermission('SUBSCRIPTION.PLANS.LIST')
  findAll() {
    return this.planService.findAll();
  }

  @Get(':id')
  @RequirePermission('SUBSCRIPTION.PLANS.VIEW')
  findOne(@Param('id') id: string) {
    return this.planService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('SUBSCRIPTION.PLANS.EDIT')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionPlanDto,
  ) {
    return this.planService.update(id, updateDto);
  }
}
