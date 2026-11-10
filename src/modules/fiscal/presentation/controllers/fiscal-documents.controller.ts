import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../../rbac/decorators/require-permission.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { EmitOrderInvoiceUseCase } from '../../application/use-cases/emit-order-invoice.use-case';
import { CancelFiscalDocumentUseCase } from '../../application/use-cases/cancel-fiscal-document.use-case';
import { FiscalDocumentsService } from '../../application/services/fiscal-documents.service';
import { CancelFiscalDocumentDto, EmitOrderInvoiceDto } from '../dtos/fiscal-document.dto';
import type { FiscalDocument } from '../../entities/fiscal-document.entity';
import type { User } from '../../../security/entities/user.entity';

@ApiTags('fiscal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fiscal')
export class FiscalDocumentsController {
  constructor(
    private readonly emit: EmitOrderInvoiceUseCase,
    private readonly cancel: CancelFiscalDocumentUseCase,
    private readonly documents: FiscalDocumentsService,
  ) {}

  /** Emite el e-CF de venta de un pedido vía el proveedor configurado. */
  @Post('ecf/emit')
  @RequirePermission('IMPORTCORE.FISCAL.EMIT_ECF')
  emitInvoice(@Body() dto: EmitOrderInvoiceDto, @CurrentUser() user: User): Promise<FiscalDocument> {
    return this.emit.execute(dto, user);
  }

  @Get('documents')
  @RequirePermission('IMPORTCORE.FISCAL.READ')
  list(@Query('period') period?: string, @Query('orderId') orderId?: string): Promise<FiscalDocument[]> {
    return this.documents.list({ period, orderId });
  }

  @Get('documents/:id')
  @RequirePermission('IMPORTCORE.FISCAL.READ')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FiscalDocument> {
    return this.documents.findById(id);
  }

  @Post('documents/:id/refresh')
  @RequirePermission('IMPORTCORE.FISCAL.EMIT_ECF')
  refresh(@Param('id', ParseUUIDPipe) id: string): Promise<FiscalDocument> {
    return this.documents.refreshStatus(id);
  }

  @Post('documents/:id/cancel')
  @RequirePermission('IMPORTCORE.FISCAL.EMIT_ECF')
  cancelDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelFiscalDocumentDto,
    @CurrentUser() user: User,
  ): Promise<FiscalDocument> {
    return this.cancel.execute(id, dto, user);
  }
}
