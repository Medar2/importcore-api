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
import { ShippingService } from '../../application/services/shipping.service';
import { ContainerOrdersSyncService } from '../../application/services/container-orders-sync.service';
import { SendBalanceRemindersUseCase } from '../../../orders/application/use-cases/send-balance-reminders.use-case';
import {
  CreateContainerDto,
  OptimizeLoadDto,
  UpdateContainerDto,
} from '../dtos/shipping.dto';
import { ShipmentContainer } from '../../entities/shipment-container.entity';

@ApiTags('shipping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly service: ShippingService,
    private readonly ordersSync: ContainerOrdersSyncService,
    private readonly reminders: SendBalanceRemindersUseCase,
  ) {}

  /** Optimiza tipo y numero de contenedores para CBM/peso dados. */
  @Post('optimize')
  @RequirePermission('IMPORTCORE.CONTAINERS.READ')
  optimize(@Body() dto: OptimizeLoadDto) {
    return this.service.optimize(dto);
  }

  @Post('containers')
  @RequirePermission('IMPORTCORE.CONTAINERS.WRITE')
  create(@Body() dto: CreateContainerDto): Promise<ShipmentContainer> {
    return this.service.create(dto);
  }

  /** Contenedores abiertos con espacio restante (consolidacion). */
  @Get('containers/availability')
  @RequirePermission('IMPORTCORE.CONTAINERS.READ')
  availability() {
    return this.service.availability();
  }

  @Get('containers')
  @RequirePermission('IMPORTCORE.CONTAINERS.READ')
  findAll(@Query('status') status?: string): Promise<ShipmentContainer[]> {
    return this.service.findAll(status);
  }

  @Get('containers/:id')
  @RequirePermission('IMPORTCORE.CONTAINERS.READ')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ShipmentContainer> {
    return this.service.findById(id);
  }

  /** Incluye estimado de demurrage en la respuesta. */
  @Get('containers/:id/demurrage')
  @RequirePermission('IMPORTCORE.CONTAINERS.READ')
  async demurrage(@Param('id', ParseUUIDPipe) id: string) {
    const c = await this.service.findById(id);
    return { container: c.containerNumber, ...this.service.demurrageEstimate(c) };
  }

  /**
   * Si cambia el estado, sincroniza los pedidos asignados y envía los
   * recordatorios de saldo que correspondan (llegada / ETA <= 3 días).
   */
  @Patch('containers/:id')
  @RequirePermission('IMPORTCORE.CONTAINERS.WRITE')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContainerDto,
  ) {
    const container = await this.service.update(id, dto);
    if (!dto.status) return container;
    const { updated } = await this.ordersSync.sync(container);
    const reminders = await this.reminders.execute(new Date(), [container.id]);
    return { ...container, ordersUpdated: updated, remindersSent: reminders.sent };
  }
}
