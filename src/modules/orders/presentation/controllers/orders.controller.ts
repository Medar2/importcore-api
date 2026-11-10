import {
  Body,
  Controller,
  Get,
  Ip,
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
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { OrdersService } from '../../application/services/orders.service';
import { DispatchService } from '../../application/services/dispatch.service';
import { ChangeOrderStatusUseCase } from '../../application/use-cases/change-order-status.use-case';
import {
  ChangeOrderStatusDto,
  CreateOrderDto,
  DispatchOrderDto,
  RegisterPaymentDto,
} from '../dtos/order.dto';
import type { Order, OrderStatus } from '../../entities/order.entity';
import type { OrderPayment } from '../../entities/order-payment.entity';
import type { User } from '../../../security/entities/user.entity';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly dispatch: DispatchService,
    private readonly changeStatus: ChangeOrderStatusUseCase,
  ) {}

  @Post()
  @RequirePermission('IMPORTCORE.ORDERS.WRITE')
  create(@Body() dto: CreateOrderDto): Promise<Order> {
    return this.orders.create(dto);
  }

  @Get()
  @RequirePermission('IMPORTCORE.ORDERS.READ')
  findAll(@Query('status') status?: OrderStatus): Promise<Order[]> {
    return this.orders.findAll(status);
  }

  @Get(':id')
  @RequirePermission('IMPORTCORE.ORDERS.READ')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Order> {
    return this.orders.findById(id);
  }

  @Get(':id/balance')
  @RequirePermission('IMPORTCORE.ORDERS.READ')
  balance(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.balance(id);
  }

  /** Tracking del pedido y estado de liberación aduanal para el cliente. */
  @Get(':id/tracking')
  @RequirePermission('IMPORTCORE.ORDERS.READ')
  tracking(@Param('id', ParseUUIDPipe) id: string) {
    return this.orders.tracking(id);
  }

  @Patch(':id/status')
  @RequirePermission('IMPORTCORE.ORDERS.WRITE')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeOrderStatusDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ): Promise<Order> {
    return this.changeStatus.execute(id, dto.status, user, dto.notes, ip);
  }

  @Post(':id/payments')
  @RequirePermission('IMPORTCORE.ORDERS.REGISTER_PAYMENT')
  pay(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegisterPaymentDto,
  ): Promise<OrderPayment> {
    return this.orders.registerPayment(id, dto);
  }

  /**
   * Autoriza el despacho. Aplica BR-003: bloquea si balance >= $0.01
   * salvo override con permiso IMPORTCORE.ORDERS.OVERRIDE_DISPATCH.
   */
  @Post(':id/dispatch')
  @RequirePermission('IMPORTCORE.ORDERS.AUTHORIZE_DISPATCH')
  dispatchOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DispatchOrderDto,
    @CurrentUser() user: User,
    @Ip() ip: string,
  ) {
    return this.dispatch.authorizeDispatch(
      id,
      user,
      dto.overrideReason,
      ip,
    );
  }
}
