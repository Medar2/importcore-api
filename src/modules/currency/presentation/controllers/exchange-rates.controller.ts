import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../../rbac/decorators/require-permission.decorator';
import { ExchangeRatesService } from '../../application/services/exchange-rates.service';
import { UpsertExchangeRateDto } from '../dtos/exchange-rate.dto';
import { ExchangeRate } from '../../entities/exchange-rate.entity';

@ApiTags('exchange-rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Get()
  @RequirePermission('IMPORTCORE.EXCHANGE_RATES.READ')
  findAll(): Promise<ExchangeRate[]> {
    return this.service.findAll();
  }

  /** Tasa mas reciente para un par, opcionalmente a una fecha. */
  @Get('latest/:base/:quote')
  @RequirePermission('IMPORTCORE.EXCHANGE_RATES.READ')
  findLatest(
    @Param('base') base: string,
    @Param('quote') quote: string,
    @Query('date') date?: string,
  ): Promise<ExchangeRate | null> {
    return this.service.findLatest(base, quote, date);
  }

  @Post()
  @RequirePermission('IMPORTCORE.EXCHANGE_RATES.MANAGE')
  upsert(@Body() dto: UpsertExchangeRateDto): Promise<ExchangeRate> {
    return this.service.upsert(dto);
  }
}
