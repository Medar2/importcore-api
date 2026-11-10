import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from '../dto/subscription.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../rbac/decorators/require-permission.decorator';
import { GetUser } from '../../security/decorators/get-user.decorator';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Post()
  @RequirePermission('SUBSCRIPTION.MANAGE.CREATE')
  create(@Body() createDto: CreateSubscriptionDto) {
    return this.subscriptionService.create(createDto);
  }

  @Get()
  @RequirePermission('SUBSCRIPTION.MANAGE.LIST')
  findAll() {
    return this.subscriptionService.findAll();
  }

  @Get('my-subscription')
  getMySubscription(@GetUser('id') userId: string) {
    return this.subscriptionService.getActiveSubscription(userId);
  }

  @Get(':id')
  @RequirePermission('SUBSCRIPTION.MANAGE.VIEW')
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('SUBSCRIPTION.MANAGE.EDIT')
  update(@Param('id') id: string, @Body() updateDto: UpdateSubscriptionDto) {
    return this.subscriptionService.update(id, updateDto);
  }

  @Get('user/:userId')
  @RequirePermission('SUBSCRIPTION.MANAGE.VIEW_USER')
  findByUserId(@Param('userId') userId: string) {
    return this.subscriptionService.findByUserId(userId);
  }
}
