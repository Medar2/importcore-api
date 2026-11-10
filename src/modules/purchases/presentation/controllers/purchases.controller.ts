import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../../rbac/decorators/require-permission.decorator';
import { PurchasesService } from '../../application/services/purchases.service';
import {
  CreatePurchaseOrderDto,
  RegisterPurchasePaymentDto,
  UpdatePurchaseOrderDto,
} from '../dtos/purchase.dto';
import type { PurchaseOrder } from '../../entities/purchase-order.entity';
import type { PurchasePayment } from '../../entities/purchase-payment.entity';

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly service: PurchasesService) {}

  @Post('orders')
  @RequirePermission('IMPORTCORE.PURCHASES.WRITE')
  create(@Body() dto: CreatePurchaseOrderDto): Promise<PurchaseOrder> {
    return this.service.create(dto);
  }

  @Get('orders')
  @RequirePermission('IMPORTCORE.PURCHASES.READ')
  findAll(@Query('status') status?: string): Promise<PurchaseOrder[]> {
    return this.service.findAll(status);
  }

  @Get('orders/:id')
  @RequirePermission('IMPORTCORE.PURCHASES.READ')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PurchaseOrder> {
    return this.service.findById(id);
  }

  @Get('orders/:id/balance')
  @RequirePermission('IMPORTCORE.PURCHASES.READ')
  balance(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.balance(id);
  }

  @Patch('orders/:id')
  @RequirePermission('IMPORTCORE.PURCHASES.WRITE')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    return this.service.update(id, dto);
  }

  @Post('orders/:id/payments')
  @RequirePermission('IMPORTCORE.PURCHASES.REGISTER_PAYMENT')
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterPurchasePaymentDto,
  ): Promise<PurchasePayment> {
    return this.service.registerPayment(id, dto);
  }
}
