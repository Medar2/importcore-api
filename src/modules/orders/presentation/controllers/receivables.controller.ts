import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../../rbac/decorators/require-permission.decorator';
import { GetReceivablesAgingUseCase } from '../../application/use-cases/get-receivables-aging.use-case';
import { SendBalanceRemindersUseCase } from '../../application/use-cases/send-balance-reminders.use-case';
import type { ReminderRunResult } from '../../application/use-cases/send-balance-reminders.use-case';
import type { AgingReport } from '../../domain/receivables-aging.calculator';

@ApiTags('receivables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('receivables')
export class ReceivablesController {
  constructor(
    private readonly aging: GetReceivablesAgingUseCase,
    private readonly reminders: SendBalanceRemindersUseCase,
  ) {}

  /** Saldos pendientes por tramo 0-30 / 31-60 / 61-90 / 90+ días. */
  @Get('aging')
  @RequirePermission('IMPORTCORE.ORDERS.READ')
  getAging(): Promise<AgingReport> {
    return this.aging.execute();
  }

  /** Ejecuta ya la corrida diaria de recordatorios de saldo. */
  @Post('reminders/run')
  @RequirePermission('IMPORTCORE.ORDERS.WRITE')
  runReminders(): Promise<ReminderRunResult> {
    return this.reminders.execute();
  }
}
