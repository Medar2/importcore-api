import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../rbac/guards/permissions.guard';
import { RequirePermission } from '../../../rbac/decorators/require-permission.decorator';
import { CreateQuoteUseCase } from '../../application/use-cases/create-quote.use-case';
import { QuoteQueriesService } from '../../application/services/quote-queries.service';
import { QuotePdfService } from '../../infrastructure/pdf/quote-pdf.service';
import { CalculateQuoteCostUseCase } from '../../application/use-cases/calculate-quote-cost.use-case';
import { CalculateQuoteRequestDto } from '../dtos/calculate-landed-cost-request.dto';
import { CreateQuoteDto } from '../dtos/create-quote.dto';
import type { QuoteComputationResult } from '../dtos/quote-calculation-result.dto';
import type { Quote, QuoteStatus } from '../../entities/quote.entity';

@ApiTags('quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('quotes')
export class LandedCostController {
  constructor(
    private readonly calculateQuote: CalculateQuoteCostUseCase,
    private readonly createQuote: CreateQuoteUseCase,
    private readonly queries: QuoteQueriesService,
    private readonly pdf: QuotePdfService,
  ) {}

  /** Calculo stateless (sin persistir). */
  @Post('calculate')
  @RequirePermission('IMPORTCORE.QUOTES.CREATE')
  calculate(@Body() dto: CalculateQuoteRequestDto): QuoteComputationResult {
    return this.calculateQuote.execute(dto);
  }

  /** Crea y persiste una cotizacion en estado DRAFT. */
  @Post()
  @RequirePermission('IMPORTCORE.QUOTES.CREATE')
  create(@Body() dto: CreateQuoteDto): Promise<Quote> {
    return this.createQuote.execute(dto);
  }

  @Get()
  @RequirePermission('IMPORTCORE.QUOTES.READ')
  findAll(@Query('status') status?: QuoteStatus): Promise<Quote[]> {
    return this.queries.findAll(status);
  }

  @Get(':id')
  @RequirePermission('IMPORTCORE.QUOTES.READ')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Quote> {
    return this.queries.findById(id);
  }

  /** Descarga el PDF de la cotizacion. */
  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  @RequirePermission('IMPORTCORE.QUOTES.PDF')
  async pdfQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const quote = await this.queries.findById(id);
    const buffer = await this.pdf.generate(quote);
    res.setHeader('Content-Disposition', `inline; filename="${quote.quoteNumber}.pdf"`);
    res.send(buffer);
  }

  /** Transicion de estado: SENT | ACCEPTED | REJECTED | CONVERTED. */
  @Patch(':id/status')
  @RequirePermission('IMPORTCORE.QUOTES.UPDATE')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: QuoteStatus,
  ): Promise<Quote> {
    return this.queries.transition(id, status);
  }
}
