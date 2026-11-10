import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { NcfSequencesService } from '../../application/services/ncf-sequences.service';
import { FiscalPurchasesService } from '../../application/services/fiscal-purchases.service';
import { CreateNcfSequenceDto } from '../dtos/ncf-sequence.dto';
import { CreateFiscalPurchaseDto } from '../dtos/fiscal-purchase.dto';
import {
  CANCELLATION_TYPES,
  ECF_TYPES,
  GOODS_SERVICES_TYPES,
  INCOME_TYPES,
  ISR_WITHHOLDING_TYPES,
  PURCHASE_PAYMENT_METHODS,
} from '../../domain/dgii-catalogs';

/** Secuencias e-NCF, compras locales (606) y catálogos DGII. */
@ApiTags('fiscal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('fiscal')
export class FiscalSetupController {
  constructor(
    private readonly sequences: NcfSequencesService,
    private readonly purchases: FiscalPurchasesService,
  ) {}

  @Get('catalogs')
  @RequirePermission('IMPORTCORE.FISCAL.READ')
  catalogs() {
    return {
      ecfTypes: ECF_TYPES,
      goodsServicesTypes: GOODS_SERVICES_TYPES,
      purchasePaymentMethods: PURCHASE_PAYMENT_METHODS,
      isrWithholdingTypes: ISR_WITHHOLDING_TYPES,
      incomeTypes: INCOME_TYPES,
      cancellationTypes: CANCELLATION_TYPES,
    };
  }

  @Get('sequences')
  @RequirePermission('IMPORTCORE.FISCAL.READ')
  listSequences() {
    return this.sequences.list();
  }

  @Post('sequences')
  @RequirePermission('IMPORTCORE.FISCAL.MANAGE')
  createSequence(@Body() dto: CreateNcfSequenceDto) {
    return this.sequences.create(dto);
  }

  @Get('purchases')
  @RequirePermission('IMPORTCORE.FISCAL.READ')
  listPurchases(@Query('period') period?: string) {
    return this.purchases.list(period);
  }

  @Post('purchases')
  @RequirePermission('IMPORTCORE.FISCAL.MANAGE')
  createPurchase(@Body() dto: CreateFiscalPurchaseDto) {
    return this.purchases.create(dto);
  }

  @Delete('purchases/:id')
  @HttpCode(204)
  @RequirePermission('IMPORTCORE.FISCAL.MANAGE')
  removePurchase(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.purchases.remove(id);
  }
}
